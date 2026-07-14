// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Escrow for peer-to-peer fitness class credit trades. Settles payment
/// only on explicit buyer confirmation, a delivery timeout (refund), a confirm
/// timeout (auto-release), or arbiter dispute resolution. Never attempts to
/// verify the class credit itself on-chain — that fact is only visible to the
/// buyer in their own studio account.
contract ClassEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Claimed,
        Delivered,
        Confirmed,
        Disputed,
        Resolved,
        Refunded
    }

    struct Listing {
        address seller;
        uint256 price;
        uint256 bondAmount;
        bytes32 proofHash;
        bool active;
    }

    struct Order {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 bondAmount;
        bytes32 deliveryProofHash;
        uint64 claimedAt;
        uint64 deliveryDeadline;
        uint64 confirmDeadline;
        Status status;
    }

    IERC20 public immutable paymentToken;
    address public arbiter;
    address public feeRecipient;
    uint16 public feeBps;
    uint16 public constant MAX_FEE_BPS = 1000;

    uint64 public deliveryWindow = 48 hours;
    uint64 public confirmWindow = 24 hours;

    uint256 public nextListingId = 1;
    uint256 public nextOrderId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256) public bonds;

    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price, uint256 bondAmount, bytes32 proofHash);
    event ListingCancelled(uint256 indexed listingId);
    event OrderClaimed(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer);
    event OrderDelivered(uint256 indexed orderId, bytes32 proofHash);
    event OrderConfirmed(uint256 indexed orderId);
    event OrderAutoReleased(uint256 indexed orderId);
    event OrderRefunded(uint256 indexed orderId);
    event OrderDisputed(uint256 indexed orderId, address indexed initiator);
    event OrderResolved(uint256 indexed orderId, address winner);

    error ZeroAddress();
    error ZeroPrice();
    error FeeTooHigh();
    error ListingNotActive();
    error NotSeller();
    error NotBuyer();
    error NotParty();
    error NotArbiter();
    error InvalidStatus();
    error TooEarly();
    error TooLate();
    error InvalidWinner();

    constructor(address paymentToken_, address arbiter_, address feeRecipient_, uint16 feeBps_) Ownable(msg.sender) {
        if (paymentToken_ == address(0) || arbiter_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        paymentToken = IERC20(paymentToken_);
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setArbiter(address arbiter_) external onlyOwner {
        if (arbiter_ == address(0)) revert ZeroAddress();
        arbiter = arbiter_;
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
    }

    function setFeeBps(uint16 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = feeBps_;
    }

    function setWindows(uint64 deliveryWindow_, uint64 confirmWindow_) external onlyOwner {
        deliveryWindow = deliveryWindow_;
        confirmWindow = confirmWindow_;
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    /// @param bondAmount optional seller collateral, forfeited to the buyer if the
    /// seller loses a dispute; returned to the seller on completion or timeout-refund.
    function createListing(uint256 price, uint256 bondAmount, bytes32 proofHash) external nonReentrant returns (uint256 listingId) {
        if (price == 0) revert ZeroPrice();

        listingId = nextListingId++;
        listings[listingId] = Listing({seller: msg.sender, price: price, bondAmount: bondAmount, proofHash: proofHash, active: true});

        if (bondAmount > 0) {
            paymentToken.safeTransferFrom(msg.sender, address(this), bondAmount);
            bonds[msg.sender] += bondAmount;
        }

        emit ListingCreated(listingId, msg.sender, price, bondAmount, proofHash);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingNotActive();

        l.active = false;
        if (l.bondAmount > 0) {
            bonds[msg.sender] -= l.bondAmount;
            paymentToken.safeTransfer(msg.sender, l.bondAmount);
        }

        emit ListingCancelled(listingId);
    }

    // ---------------------------------------------------------------------
    // Orders
    // ---------------------------------------------------------------------

    function claim(uint256 listingId) external nonReentrant returns (uint256 orderId) {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingNotActive();
        l.active = false;

        uint64 nowTs = uint64(block.timestamp);
        orderId = nextOrderId++;
        orders[orderId] = Order({
            listingId: listingId,
            buyer: msg.sender,
            seller: l.seller,
            amount: l.price,
            bondAmount: l.bondAmount,
            deliveryProofHash: bytes32(0),
            claimedAt: nowTs,
            deliveryDeadline: nowTs + deliveryWindow,
            confirmDeadline: 0,
            status: Status.Claimed
        });

        paymentToken.safeTransferFrom(msg.sender, address(this), l.price);
        emit OrderClaimed(orderId, listingId, msg.sender);
    }

    /// @notice Seller marks the class credit as transferred, committing a hash of
    /// off-chain proof (screenshot/confirmation) so it can't be swapped after the fact.
    function markDelivered(uint256 orderId, bytes32 proofHash) external {
        Order storage o = orders[orderId];
        if (o.seller != msg.sender) revert NotSeller();
        if (o.status != Status.Claimed) revert InvalidStatus();
        if (block.timestamp > o.deliveryDeadline) revert TooLate();

        o.deliveryProofHash = proofHash;
        o.confirmDeadline = uint64(block.timestamp) + confirmWindow;
        o.status = Status.Delivered;
        emit OrderDelivered(orderId, proofHash);
    }

    /// @notice Buyer confirms the class actually appeared in their studio account.
    function confirmReceipt(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != Status.Delivered) revert InvalidStatus();

        o.status = Status.Confirmed;
        _release(o);
        emit OrderConfirmed(orderId);
    }

    /// @notice Anyone can trigger release to the seller once the confirm window has
    /// elapsed without the buyer confirming or disputing — prevents a buyer from
    /// griefing a legitimate seller by staying silent.
    function autoRelease(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.status != Status.Delivered) revert InvalidStatus();
        if (block.timestamp <= o.confirmDeadline) revert TooEarly();

        o.status = Status.Confirmed;
        _release(o);
        emit OrderAutoReleased(orderId);
    }

    /// @notice Buyer reclaims funds if the seller never marks delivery before the deadline.
    function refund(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.status != Status.Claimed) revert InvalidStatus();
        if (block.timestamp <= o.deliveryDeadline) revert TooEarly();

        o.status = Status.Refunded;
        paymentToken.safeTransfer(o.buyer, o.amount);
        _returnBond(o, o.seller);
        emit OrderRefunded(orderId);
    }

    /// @notice Either party disputes a delivered order before the confirm window elapses.
    function raiseDispute(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (msg.sender != o.buyer && msg.sender != o.seller) revert NotParty();
        if (o.status != Status.Delivered) revert InvalidStatus();
        if (block.timestamp > o.confirmDeadline) revert TooLate();

        o.status = Status.Disputed;
        emit OrderDisputed(orderId, msg.sender);
    }

    /// @notice Arbiter-only resolution. Winner takes the escrowed payment; if the
    /// seller loses, their bond is forfeited to the buyer as a penalty.
    function resolveDispute(uint256 orderId, address winner) external nonReentrant {
        if (msg.sender != arbiter) revert NotArbiter();
        Order storage o = orders[orderId];
        if (o.status != Status.Disputed) revert InvalidStatus();
        if (winner != o.buyer && winner != o.seller) revert InvalidWinner();

        o.status = Status.Resolved;
        if (winner == o.seller) {
            _release(o);
        } else {
            paymentToken.safeTransfer(o.buyer, o.amount);
            _forfeitBond(o, o.buyer);
        }

        emit OrderResolved(orderId, winner);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _release(Order storage o) internal {
        uint256 fee = (o.amount * feeBps) / 10_000;
        uint256 payout = o.amount - fee;
        if (fee > 0) paymentToken.safeTransfer(feeRecipient, fee);
        paymentToken.safeTransfer(o.seller, payout);
        _returnBond(o, o.seller);
    }

    function _returnBond(Order storage o, address seller) internal {
        if (o.bondAmount > 0) {
            bonds[seller] -= o.bondAmount;
            paymentToken.safeTransfer(seller, o.bondAmount);
        }
    }

    function _forfeitBond(Order storage o, address to) internal {
        if (o.bondAmount > 0) {
            bonds[o.seller] -= o.bondAmount;
            paymentToken.safeTransfer(to, o.bondAmount);
        }
    }
}
