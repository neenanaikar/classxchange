"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { unitsToUsdc } from "@/lib/format";

type OrderWithListing = {
  id: string;
  status: string;
  amountUsdc: number;
  buyerWallet: string;
  sellerWallet: string;
  listing: { studio: string; classType: string | null };
};

export default function OrdersPage() {
  const { address } = useAccount();
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Sign in to see your orders.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        My orders
      </h1>

      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--color-text-dim)]">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--color-text-dim)]">No orders yet.</p>
      ) : (
        <div className="mt-8 border-t border-[color:var(--color-border)]">
          {orders.map((order) => {
            const role =
              order.buyerWallet.toLowerCase() === address.toLowerCase()
                ? "Buying"
                : "Selling";
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between border-b border-[color:var(--color-border)] px-2 py-5 hover:bg-[color:var(--color-surface)]"
              >
                <div>
                  <p className="font-heading text-lg uppercase tracking-tight text-[color:var(--color-text)]">
                    {order.listing.studio}
                    {order.listing.classType ? ` — ${order.listing.classType}` : ""}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
                    {role} · ${unitsToUsdc(order.amountUsdc)}
                  </p>
                </div>
                <span className="border border-[color:var(--color-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
                  {order.status.replace("_", " ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
