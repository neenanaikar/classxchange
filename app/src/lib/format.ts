const USDC_DECIMALS = 6;

export function usdcToUnits(amount: string | number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(whole || "0") * 10n ** BigInt(USDC_DECIMALS) + BigInt(paddedFrac || "0");
}

export function unitsToUsdc(units: bigint | number): string {
  const value = typeof units === "bigint" ? units : BigInt(Math.round(units));
  const divisor = 10n ** BigInt(USDC_DECIMALS);
  const whole = value / divisor;
  const frac = value % divisor;
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, "0").slice(0, 2)}`;
}
