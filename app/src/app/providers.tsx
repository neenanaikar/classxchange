"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appChain, wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-800">
          Wallet provider not configured
        </p>
        <p className="mt-2">
          Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in{" "}
          <code>.env.local</code> (create a free app at{" "}
          <a href="https://dashboard.privy.io" className="underline">
            dashboard.privy.io
          </a>
          ) to enable login.
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "sms"],
        appearance: {
          theme: "light",
          accentColor: "#171717",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: appChain,
        supportedChains: [appChain],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
