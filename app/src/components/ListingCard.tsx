"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { unitsToUsdc } from "@/lib/format";
import { claimOnChain } from "@/lib/actions";

type Listing = {
  id: string;
  onchainId: number;
  sellerWallet: string;
  studio: string;
  classType: string | null;
  location: string;
  expiresAt: string;
  priceUsdc: number;
  bondUsdc: number;
  proofImageUrl: string;
};

export function ListingRow({ listing }: { listing: Listing }) {
  const { address } = useAccount();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnListing = address?.toLowerCase() === listing.sellerWallet.toLowerCase();
  const expiresInDays = Math.ceil(
    (new Date(listing.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  async function handleClaim() {
    if (!address) return;
    setClaiming(true);
    setError(null);
    try {
      const { orderId } = await claimOnChain({
        owner: address,
        listingId: BigInt(listing.onchainId),
        price: BigInt(listing.priceUsdc),
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onchainId: Number(orderId),
          listingId: listing.id,
          buyerWallet: address,
          sellerWallet: listing.sellerWallet,
          amountUsdc: listing.priceUsdc,
          deliveryDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        }),
      });
      const order = await res.json();
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim listing");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] px-8 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-12">
      <div>
        <h3 className="font-heading text-xl uppercase tracking-tight text-[color:var(--color-text)]">
          {listing.studio}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
          {listing.classType ?? "Any class"}
          {listing.location && ` · ${listing.location}`}
          {" · "}
          <span className={expiresInDays <= 3 ? "text-[color:var(--color-accent)]" : ""}>
            {expiresInDays > 0
              ? `expires in ${expiresInDays} day${expiresInDays === 1 ? "" : "s"}`
              : "expired"}
          </span>
        </p>
        {listing.bondUsdc > 0 && (
          <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
            +${unitsToUsdc(listing.bondUsdc)} seller bond
          </p>
        )}
        {error && <p className="mt-1 text-xs text-[color:var(--color-accent)]">{error}</p>}
      </div>

      <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-3">
        <p className="font-heading text-2xl text-[color:var(--color-accent)]">
          ${unitsToUsdc(listing.priceUsdc)}
        </p>
        <button
          onClick={handleClaim}
          disabled={claiming || isOwnListing || !address}
          className="border border-[color:var(--color-border)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
        >
          {isOwnListing
            ? "Your listing"
            : !address
              ? "Sign in to buy"
              : claiming
                ? "Claiming..."
                : "Buy this class"}
        </button>
      </div>
    </div>
  );
}
