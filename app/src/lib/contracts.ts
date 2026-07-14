import classEscrowAbi from "./classEscrowAbi.json";
import mockUsdcAbi from "./mockUsdcAbi.json";

export const CLASS_ESCROW_ADDRESS = process.env
  .NEXT_PUBLIC_CLASS_ESCROW_ADDRESS as `0x${string}`;

export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export const classEscrowConfig = {
  address: CLASS_ESCROW_ADDRESS,
  abi: classEscrowAbi,
} as const;

export const usdcConfig = {
  address: USDC_ADDRESS,
  abi: mockUsdcAbi,
} as const;

export enum OrderStatus {
  None = 0,
  Claimed = 1,
  Delivered = 2,
  Confirmed = 3,
  Disputed = 4,
  Resolved = 5,
  Refunded = 6,
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.None]: "Unknown",
  [OrderStatus.Claimed]: "Awaiting delivery",
  [OrderStatus.Delivered]: "Awaiting confirmation",
  [OrderStatus.Confirmed]: "Complete",
  [OrderStatus.Disputed]: "Disputed",
  [OrderStatus.Resolved]: "Resolved",
  [OrderStatus.Refunded]: "Refunded",
};
