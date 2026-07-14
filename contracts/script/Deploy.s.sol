// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ClassEscrow} from "../src/ClassEscrow.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";

/// @notice Local/testnet deploy script. Set PAYMENT_TOKEN_ADDRESS to point at
/// a real USDC deployment (e.g. Base Sepolia's Circle-issued testnet USDC);
/// if unset, deploys and seeds a MockUSDC for local Anvil use.
contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address arbiter = vm.envOr("ARBITER_ADDRESS", deployer);
        address feeRecipient = vm.envOr("FEE_RECIPIENT_ADDRESS", deployer);
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(250)));
        address paymentTokenOverride = vm.envOr("PAYMENT_TOKEN_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);

        address paymentToken;
        if (paymentTokenOverride != address(0)) {
            paymentToken = paymentTokenOverride;
            console.log("Using existing payment token:", paymentToken);
        } else {
            MockUSDC usdc = new MockUSDC();
            paymentToken = address(usdc);
            console.log("MockUSDC deployed at:", paymentToken);

            // Seed a couple of dev wallets with mock USDC so the UI has something
            // to trade with locally. Only relevant when we deployed the mock.
            address[3] memory seedWallets = [
                0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // anvil account 0
                0x70997970C51812dc3A010C7d01b50e0d17dc79C8, // anvil account 1
                0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC // anvil account 2
            ];
            for (uint256 i = 0; i < seedWallets.length; i++) {
                MockUSDC(paymentToken).mint(seedWallets[i], 10_000e6);
            }
        }

        ClassEscrow escrow = new ClassEscrow(paymentToken, arbiter, feeRecipient, feeBps);

        vm.stopBroadcast();

        console.log("ClassEscrow deployed at:", address(escrow));
        console.log("Payment token:", paymentToken);
        console.log("Arbiter:", arbiter);
        console.log("Fee recipient:", feeRecipient);
    }
}
