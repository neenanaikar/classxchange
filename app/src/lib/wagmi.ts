import { createConfig } from "@privy-io/wagmi";
import { defineChain } from "viem";
import { http } from "wagmi";

// Matches the local Anvil chain (`anvil` default: chainId 31337, rpc :8545).
// Point NEXT_PUBLIC_RPC_URL / NEXT_PUBLIC_CHAIN_ID at Base Sepolia or Base
// mainnet for a real deployment.
export const appChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337),
  name: "classxchange-dev",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545"] },
  },
});

export const wagmiConfig = createConfig({
  chains: [appChain],
  transports: {
    [appChain.id]: http(),
  },
});
