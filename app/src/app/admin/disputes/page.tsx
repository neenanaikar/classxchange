"use client";

import { useEffect, useState } from "react";
import { unitsToUsdc } from "@/lib/format";
import { resolveDisputeOnChain } from "@/lib/actions";

type DisputedOrder = {
  id: string;
  onchainId: number;
  amountUsdc: number;
  buyerWallet: string;
  sellerWallet: string;
  listing: { studio: string; classType: string | null; proofImageUrl: string };
  dispute: { reason: string } | null;
};

// Internal tool for the arbiter role described in DESIGN.md §6 — gated by
// wallet in a real deployment (multisig), no auth here since this is local-only.
export default function AdminDisputesPage() {
  const [orders, setOrders] = useState<DisputedOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/disputes")
      .then((r) => r.json())
      .then(setOrders);
  }

  useEffect(load, []);

  async function resolve(order: DisputedOrder, winner: "buyer" | "seller") {
    setBusyId(order.id);
    setError(null);
    try {
      const winnerAddress = winner === "buyer" ? order.buyerWallet : order.sellerWallet;
      await resolveDisputeOnChain(BigInt(order.onchainId), winnerAddress as `0x${string}`);
      await fetch(`/api/orders/${order.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolution failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        Disputes
      </h1>
      <p className="mt-2 text-sm text-[color:var(--color-text-dim)]">
        Arbiter view. Connected wallet must be the contract&apos;s arbiter
        address for these transactions to succeed.
      </p>

      {error && <p className="mt-4 text-sm text-[color:var(--color-accent)]">{error}</p>}

      <div className="mt-8 space-y-4">
        {orders.length === 0 && (
          <p className="text-sm text-[color:var(--color-text-dim)]">No open disputes.</p>
        )}
        {orders.map((order) => (
          <div key={order.id} className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
            <p className="font-heading text-lg uppercase tracking-tight text-[color:var(--color-text)]">
              {order.listing.studio}
              {order.listing.classType ? ` — ${order.listing.classType}` : ""}
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-accent)]">${unitsToUsdc(order.amountUsdc)}</p>
            <p className="mt-3 text-sm italic text-[color:var(--color-text-dim)]">
              &ldquo;{order.dispute?.reason || "No reason given"}&rdquo;
            </p>
            <a
              href={order.listing.proofImageUrl}
              target="_blank"
              className="mt-2 block text-sm text-[color:var(--color-accent)] underline"
            >
              View seller&apos;s balance proof
            </a>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => resolve(order, "buyer")}
                disabled={busyId === order.id}
                className="border border-[color:var(--color-border)] px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
              >
                Rule for buyer
              </button>
              <button
                onClick={() => resolve(order, "seller")}
                disabled={busyId === order.id}
                className="border border-[color:var(--color-border)] px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
              >
                Rule for seller
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
