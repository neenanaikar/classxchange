import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { decodeEventLog, type Address, type Log } from "viem";
import { wagmiConfig } from "./wagmi";
import { classEscrowConfig, usdcConfig } from "./contracts";
import classEscrowAbi from "./classEscrowAbi.json";

/// Reads current allowance and sends an approve() tx if it's insufficient.
/// Both listing bonds and order payments move through USDC's ERC20 allowance,
/// so every on-chain write in this file that moves money calls this first.
export async function ensureApproval(owner: Address, amount: bigint) {
  if (amount === 0n) return;

  const allowance = (await readContract(wagmiConfig, {
    ...usdcConfig,
    functionName: "allowance",
    args: [owner, classEscrowConfig.address],
  })) as bigint;

  if (allowance >= amount) return;

  const hash = await writeContract(wagmiConfig, {
    ...usdcConfig,
    functionName: "approve",
    args: [classEscrowConfig.address, amount],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

function decodeOrderLog(logs: readonly Log[], eventName: string) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: classEscrowAbi,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === eventName) return decoded.args as unknown as Record<string, unknown>;
    } catch {
      // log from a different contract/event; skip
    }
  }
  throw new Error(`${eventName} event not found in receipt`);
}

export async function createListingOnChain(params: {
  owner: Address;
  price: bigint;
  bond: bigint;
  proofHash: `0x${string}`;
}) {
  await ensureApproval(params.owner, params.bond);

  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "createListing",
    args: [params.price, params.bond, params.proofHash],
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  const args = decodeOrderLog(receipt.logs, "ListingCreated");
  return { listingId: args.listingId as bigint, txHash: hash };
}

export async function cancelListingOnChain(listingId: bigint) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "cancelListing",
    args: [listingId],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function claimOnChain(params: { owner: Address; listingId: bigint; price: bigint }) {
  await ensureApproval(params.owner, params.price);

  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "claim",
    args: [params.listingId],
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  const args = decodeOrderLog(receipt.logs, "OrderClaimed");
  return { orderId: args.orderId as bigint, txHash: hash };
}

export async function markDeliveredOnChain(orderId: bigint, proofHash: `0x${string}`) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "markDelivered",
    args: [orderId, proofHash],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function confirmReceiptOnChain(orderId: bigint) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "confirmReceipt",
    args: [orderId],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function raiseDisputeOnChain(orderId: bigint) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "raiseDispute",
    args: [orderId],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function refundOnChain(orderId: bigint) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "refund",
    args: [orderId],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function autoReleaseOnChain(orderId: bigint) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "autoRelease",
    args: [orderId],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export async function resolveDisputeOnChain(orderId: bigint, winner: Address) {
  const hash = await writeContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "resolveDispute",
    args: [orderId, winner],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

export type OnchainOrder = {
  listingId: bigint;
  buyer: Address;
  seller: Address;
  amount: bigint;
  bondAmount: bigint;
  deliveryProofHash: `0x${string}`;
  claimedAt: bigint;
  deliveryDeadline: bigint;
  confirmDeadline: bigint;
  status: number;
};

/// Reads the order struct straight from the contract — the source of truth
/// for status and deadlines. The off-chain DB mirrors this for fast reads and
/// stores what the contract can't (studio name, proof images), but this is
/// what a status display should trust.
export async function getOnchainOrder(orderId: bigint): Promise<OnchainOrder> {
  const result = (await readContract(wagmiConfig, {
    ...classEscrowConfig,
    functionName: "orders",
    args: [orderId],
  })) as [bigint, Address, Address, bigint, bigint, `0x${string}`, bigint, bigint, bigint, number];

  const [listingId, buyer, seller, amount, bondAmount, deliveryProofHash, claimedAt, deliveryDeadline, confirmDeadline, status] = result;

  return { listingId, buyer, seller, amount, bondAmount, deliveryProofHash, claimedAt, deliveryDeadline, confirmDeadline, status };
}
