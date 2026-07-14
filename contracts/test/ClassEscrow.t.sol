// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ClassEscrow} from "../src/ClassEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract ClassEscrowTest is Test {
    ClassEscrow escrow;
    MockUSDC usdc;

    address owner = makeAddr("owner");
    address arbiter = makeAddr("arbiter");
    address feeRecipient = makeAddr("feeRecipient");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address stranger = makeAddr("stranger");

    uint256 constant PRICE = 20e6; // 20 USDC, 6 decimals
    uint256 constant BOND = 4e6; // 20% bond
    uint16 constant FEE_BPS = 250; // 2.5%

    bytes32 constant BALANCE_PROOF = keccak256("balance-screenshot");
    bytes32 constant DELIVERY_PROOF = keccak256("transfer-confirmation");

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();

        vm.prank(owner);
        escrow = new ClassEscrow(address(usdc), arbiter, feeRecipient, FEE_BPS);

        usdc.mint(seller, 1_000e6);
        usdc.mint(buyer, 1_000e6);

        vm.prank(seller);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    function test_CreateListing_NoBond() public {
        vm.prank(seller);
        uint256 listingId = escrow.createListing(PRICE, 0, BALANCE_PROOF);

        (address s, uint256 price, uint256 bond, bytes32 proof, bool active) = escrow.listings(listingId);
        assertEq(s, seller);
        assertEq(price, PRICE);
        assertEq(bond, 0);
        assertEq(proof, BALANCE_PROOF);
        assertTrue(active);
    }

    function test_CreateListing_WithBond_PullsBondFromSeller() public {
        uint256 balBefore = usdc.balanceOf(seller);

        vm.prank(seller);
        escrow.createListing(PRICE, BOND, BALANCE_PROOF);

        assertEq(usdc.balanceOf(seller), balBefore - BOND);
        assertEq(usdc.balanceOf(address(escrow)), BOND);
        assertEq(escrow.bonds(seller), BOND);
    }

    function test_CreateListing_RevertZeroPrice() public {
        vm.prank(seller);
        vm.expectRevert(ClassEscrow.ZeroPrice.selector);
        escrow.createListing(0, 0, BALANCE_PROOF);
    }

    function test_CancelListing_RefundsBond() public {
        vm.prank(seller);
        uint256 listingId = escrow.createListing(PRICE, BOND, BALANCE_PROOF);

        uint256 balBefore = usdc.balanceOf(seller);
        vm.prank(seller);
        escrow.cancelListing(listingId);

        assertEq(usdc.balanceOf(seller), balBefore + BOND);
        assertEq(escrow.bonds(seller), 0);
        (,,,, bool active) = escrow.listings(listingId);
        assertFalse(active);
    }

    function test_CancelListing_RevertNotSeller() public {
        vm.prank(seller);
        uint256 listingId = escrow.createListing(PRICE, 0, BALANCE_PROOF);

        vm.prank(stranger);
        vm.expectRevert(ClassEscrow.NotSeller.selector);
        escrow.cancelListing(listingId);
    }

    // ---------------------------------------------------------------------
    // Claim
    // ---------------------------------------------------------------------

    function _createListing() internal returns (uint256 listingId) {
        vm.prank(seller);
        listingId = escrow.createListing(PRICE, BOND, BALANCE_PROOF);
    }

    function test_Claim_LocksBuyerPayment() public {
        uint256 listingId = _createListing();
        uint256 buyerBalBefore = usdc.balanceOf(buyer);

        vm.prank(buyer);
        uint256 orderId = escrow.claim(listingId);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore - PRICE);
        (,, address s, uint256 amount,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(s, seller);
        assertEq(amount, PRICE);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Claimed));
    }

    function test_Claim_DeactivatesListing() public {
        uint256 listingId = _createListing();

        vm.prank(buyer);
        escrow.claim(listingId);

        vm.prank(buyer);
        vm.expectRevert(ClassEscrow.ListingNotActive.selector);
        escrow.claim(listingId);
    }

    function test_Claim_RevertOnCancelledListing() public {
        uint256 listingId = _createListing();
        vm.prank(seller);
        escrow.cancelListing(listingId);

        vm.prank(buyer);
        vm.expectRevert(ClassEscrow.ListingNotActive.selector);
        escrow.claim(listingId);
    }

    // ---------------------------------------------------------------------
    // markDelivered
    // ---------------------------------------------------------------------

    function _claim() internal returns (uint256 orderId) {
        uint256 listingId = _createListing();
        vm.prank(buyer);
        orderId = escrow.claim(listingId);
    }

    function test_MarkDelivered_SetsConfirmDeadlineAndStatus() public {
        uint256 orderId = _claim();

        vm.prank(seller);
        escrow.markDelivered(orderId, DELIVERY_PROOF);

        (,,,,, bytes32 proof,,, uint64 confirmDeadline, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(proof, DELIVERY_PROOF);
        assertEq(confirmDeadline, uint64(block.timestamp) + escrow.confirmWindow());
        assertEq(uint8(status), uint8(ClassEscrow.Status.Delivered));
    }

    function test_MarkDelivered_RevertNotSeller() public {
        uint256 orderId = _claim();

        vm.prank(stranger);
        vm.expectRevert(ClassEscrow.NotSeller.selector);
        escrow.markDelivered(orderId, DELIVERY_PROOF);
    }

    function test_MarkDelivered_RevertAfterDeliveryDeadline() public {
        uint256 orderId = _claim();
        vm.warp(block.timestamp + escrow.deliveryWindow() + 1);

        vm.prank(seller);
        vm.expectRevert(ClassEscrow.TooLate.selector);
        escrow.markDelivered(orderId, DELIVERY_PROOF);
    }

    // ---------------------------------------------------------------------
    // confirmReceipt
    // ---------------------------------------------------------------------

    function _deliver() internal returns (uint256 orderId) {
        orderId = _claim();
        vm.prank(seller);
        escrow.markDelivered(orderId, DELIVERY_PROOF);
    }

    function test_ConfirmReceipt_PaysOutSellerMinusFeeAndReturnsBond() public {
        uint256 orderId = _deliver();

        uint256 sellerBalBefore = usdc.balanceOf(seller);
        uint256 feeRecipientBalBefore = usdc.balanceOf(feeRecipient);

        vm.prank(buyer);
        escrow.confirmReceipt(orderId);

        uint256 fee = (PRICE * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(feeRecipient), feeRecipientBalBefore + fee);
        assertEq(usdc.balanceOf(seller), sellerBalBefore + (PRICE - fee) + BOND);
        assertEq(escrow.bonds(seller), 0);

        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Confirmed));
    }

    function test_ConfirmReceipt_RevertNotBuyer() public {
        uint256 orderId = _deliver();

        vm.prank(stranger);
        vm.expectRevert(ClassEscrow.NotBuyer.selector);
        escrow.confirmReceipt(orderId);
    }

    function test_ConfirmReceipt_RevertBeforeDelivery() public {
        uint256 orderId = _claim();

        vm.prank(buyer);
        vm.expectRevert(ClassEscrow.InvalidStatus.selector);
        escrow.confirmReceipt(orderId);
    }

    // ---------------------------------------------------------------------
    // refund (delivery timeout)
    // ---------------------------------------------------------------------

    function test_Refund_AfterDeliveryDeadlineElapsed() public {
        uint256 orderId = _claim();
        vm.warp(block.timestamp + escrow.deliveryWindow() + 1);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        uint256 sellerBalBefore = usdc.balanceOf(seller);

        escrow.refund(orderId);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + PRICE);
        assertEq(usdc.balanceOf(seller), sellerBalBefore + BOND); // bond returned, not forfeited
        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Refunded));
    }

    function test_Refund_RevertTooEarly() public {
        uint256 orderId = _claim();

        vm.expectRevert(ClassEscrow.TooEarly.selector);
        escrow.refund(orderId);
    }

    function test_Refund_RevertIfAlreadyDelivered() public {
        uint256 orderId = _deliver();
        vm.warp(block.timestamp + escrow.deliveryWindow() + 1);

        vm.expectRevert(ClassEscrow.InvalidStatus.selector);
        escrow.refund(orderId);
    }

    // ---------------------------------------------------------------------
    // autoRelease (confirm timeout)
    // ---------------------------------------------------------------------

    function test_AutoRelease_AfterConfirmDeadlineElapsed() public {
        uint256 orderId = _deliver();
        vm.warp(block.timestamp + escrow.confirmWindow() + 1);

        uint256 sellerBalBefore = usdc.balanceOf(seller);

        vm.prank(stranger); // anyone can trigger it
        escrow.autoRelease(orderId);

        uint256 fee = (PRICE * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(seller), sellerBalBefore + (PRICE - fee) + BOND);
        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Confirmed));
    }

    function test_AutoRelease_RevertTooEarly() public {
        uint256 orderId = _deliver();

        vm.expectRevert(ClassEscrow.TooEarly.selector);
        escrow.autoRelease(orderId);
    }

    // ---------------------------------------------------------------------
    // Disputes
    // ---------------------------------------------------------------------

    function test_RaiseDispute_ByBuyerBeforeConfirmDeadline() public {
        uint256 orderId = _deliver();

        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Disputed));
    }

    function test_RaiseDispute_RevertAfterConfirmDeadline() public {
        uint256 orderId = _deliver();
        vm.warp(block.timestamp + escrow.confirmWindow() + 1);

        vm.prank(buyer);
        vm.expectRevert(ClassEscrow.TooLate.selector);
        escrow.raiseDispute(orderId);
    }

    function test_RaiseDispute_RevertNotParty() public {
        uint256 orderId = _deliver();

        vm.prank(stranger);
        vm.expectRevert(ClassEscrow.NotParty.selector);
        escrow.raiseDispute(orderId);
    }

    function test_ResolveDispute_SellerWins_PaysSellerAndReturnsBond() public {
        uint256 orderId = _deliver();
        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        uint256 sellerBalBefore = usdc.balanceOf(seller);

        vm.prank(arbiter);
        escrow.resolveDispute(orderId, seller);

        uint256 fee = (PRICE * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(seller), sellerBalBefore + (PRICE - fee) + BOND);
        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Resolved));
    }

    function test_ResolveDispute_BuyerWins_RefundsPaymentAndForfeitsSellerBond() public {
        uint256 orderId = _deliver();
        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);

        vm.prank(arbiter);
        escrow.resolveDispute(orderId, buyer);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + PRICE + BOND);
        assertEq(escrow.bonds(seller), 0);
        (,,,,,,,,, ClassEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(ClassEscrow.Status.Resolved));
    }

    function test_ResolveDispute_RevertNotArbiter() public {
        uint256 orderId = _deliver();
        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        vm.prank(stranger);
        vm.expectRevert(ClassEscrow.NotArbiter.selector);
        escrow.resolveDispute(orderId, seller);
    }

    function test_ResolveDispute_RevertInvalidWinner() public {
        uint256 orderId = _deliver();
        vm.prank(buyer);
        escrow.raiseDispute(orderId);

        vm.prank(arbiter);
        vm.expectRevert(ClassEscrow.InvalidWinner.selector);
        escrow.resolveDispute(orderId, stranger);
    }

    function test_ResolveDispute_RevertIfNotDisputed() public {
        uint256 orderId = _deliver();

        vm.prank(arbiter);
        vm.expectRevert(ClassEscrow.InvalidStatus.selector);
        escrow.resolveDispute(orderId, seller);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function test_Admin_SetFeeBps_RevertTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(ClassEscrow.FeeTooHigh.selector);
        escrow.setFeeBps(1001);
    }

    function test_Admin_SetFeeBps_RevertNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        escrow.setFeeBps(500);
    }

    function test_Admin_SetArbiter() public {
        address newArbiter = makeAddr("newArbiter");
        vm.prank(owner);
        escrow.setArbiter(newArbiter);
        assertEq(escrow.arbiter(), newArbiter);
    }
}
