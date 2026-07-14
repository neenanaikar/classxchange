"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { unitsToUsdc } from "@/lib/format";
import { OrderStatus, ORDER_STATUS_LABEL } from "@/lib/contracts";
import {
  getOnchainOrder,
  markDeliveredOnChain,
  confirmReceiptOnChain,
  raiseDisputeOnChain,
  refundOnChain,
  autoReleaseOnChain,
} from "@/lib/actions";

type OrderDetail = {
  id: string;
  onchainId: number;
  buyerWallet: string;
  sellerWallet: string;
  amountUsdc: number;
  deliveryProofUrl: string | null;
  requestedAt: string | null;
  requestedNote: string | null;
  status: string;
  listing: {
    studio: string;
    classType: string | null;
    location: string;
    proofImageUrl: string;
    expiresAt: string;
  };
  dispute: { reason: string; resolvedWinner: string | null } | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [onchainStatus, setOnchainStatus] = useState<OrderStatus | null>(null);
  const [confirmDeadline, setConfirmDeadline] = useState<number | null>(null);
  const [deliveryDeadline, setDeliveryDeadline] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [requestDateTime, setRequestDateTime] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setOrder(data);

    const onchain = await getOnchainOrder(BigInt(data.onchainId));
    setOnchainStatus(onchain.status as OrderStatus);
    setConfirmDeadline(Number(onchain.confirmDeadline) * 1000);
    setDeliveryDeadline(Number(onchain.deliveryDeadline) * 1000);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!order || onchainStatus === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Loading...
      </div>
    );
  }

  const isBuyer = address?.toLowerCase() === order.buyerWallet.toLowerCase();
  const isSeller = address?.toLowerCase() === order.sellerWallet.toLowerCase();
  const now = Date.now();

  async function openConversation() {
    if (!address) return;
    const otherWallet = isBuyer ? order!.sellerWallet : order!.buyerWallet;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletA: address, walletB: otherWallet, orderId: order!.id }),
    });
    const conversation = await res.json();
    router.push(`/messages/${conversation.id}`);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestClass() {
    if (!requestDateTime) {
      setError("Pick a date and time first.");
      return;
    }
    await run(async () => {
      await fetch(`/api/orders/${id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedAt: new Date(requestDateTime).toISOString(),
          requestedNote: requestNote,
        }),
      });
    });
  }

  async function handleMarkDelivered() {
    if (!proofFile) {
      setError("Upload proof the class was booked for the buyer first.");
      return;
    }
    await run(async () => {
      const formData = new FormData();
      formData.append("file", proofFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url, hash } = await uploadRes.json();

      await markDeliveredOnChain(BigInt(order!.onchainId), hash);

      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered", deliveryProofUrl: url, deliveryProofHash: hash }),
      });
    });
  }

  async function handleConfirm() {
    await run(async () => {
      await confirmReceiptOnChain(BigInt(order!.onchainId));
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
    });
  }

  async function handleDispute() {
    await run(async () => {
      await raiseDisputeOnChain(BigInt(order!.onchainId));
      await fetch(`/api/orders/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raisedBy: address, reason: disputeReason }),
      });
    });
  }

  async function handleRefund() {
    await run(async () => {
      await refundOnChain(BigInt(order!.onchainId));
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "refunded" }),
      });
    });
  }

  async function handleAutoRelease() {
    await run(async () => {
      await autoReleaseOnChain(BigInt(order!.onchainId));
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-[color:var(--color-text)]">
              {order.listing.studio}
              {order.listing.classType ? ` — ${order.listing.classType}` : ""}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">{order.listing.location}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="border border-[color:var(--color-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
              {ORDER_STATUS_LABEL[onchainStatus]}
            </span>
            {(isBuyer || isSeller) && (
              <button
                onClick={openConversation}
                className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)] underline hover:text-[color:var(--color-accent)]"
              >
                Message {isBuyer ? "seller" : "buyer"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
              Amount in escrow
            </p>
            <p className="mt-1 font-heading text-xl text-[color:var(--color-accent)]">
              ${unitsToUsdc(order.amountUsdc)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
              Your role
            </p>
            <p className="mt-1 text-[color:var(--color-text)]">
              {isBuyer ? "Buyer" : isSeller ? "Seller" : "Observer"}
            </p>
          </div>
        </div>

        <div className="mt-6 text-sm">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
            Seller&apos;s balance/expiration proof
          </p>
          <a
            href={order.listing.proofImageUrl}
            target="_blank"
            className="text-[color:var(--color-accent)] underline"
          >
            View image
          </a>
        </div>

        {order.requestedAt && (
          <div className="mt-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
              Requested class
            </p>
            <p className="mt-1 text-[color:var(--color-text)]">
              {new Date(order.requestedAt).toLocaleString()}
            </p>
            {order.requestedNote && (
              <p className="mt-1 text-[color:var(--color-text-dim)]">
                &ldquo;{order.requestedNote}&rdquo;
              </p>
            )}
          </div>
        )}

        {order.deliveryProofUrl && (
          <div className="mt-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
              Booking / guest-add proof
            </p>
            <a href={order.deliveryProofUrl} target="_blank" className="text-[color:var(--color-accent)] underline">
              View image
            </a>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-[color:var(--color-accent)]">{error}</p>}

        <div className="mt-8 space-y-3">
          {isBuyer && onchainStatus === OrderStatus.Claimed && !order.requestedAt && (
            <div className="border border-[color:var(--color-border)] p-5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text)]">
                Request your class
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
                Tell the seller which class and time you want — they&apos;ll book
                it with their credit and add you as a guest.
              </p>
              <input
                type="datetime-local"
                value={requestDateTime}
                onChange={(e) => setRequestDateTime(e.target.value)}
                className="input mt-3"
              />
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Anything else the seller should know? (optional)"
                className="input mt-3"
                rows={2}
              />
              <button
                onClick={handleRequestClass}
                disabled={busy}
                className="mt-4 bg-[color:var(--color-accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
              >
                Send request
              </button>
            </div>
          )}

          {isSeller && onchainStatus === OrderStatus.Claimed && !order.requestedAt && (
            <p className="border border-[color:var(--color-border)] p-5 text-sm text-[color:var(--color-text-dim)]">
              Waiting for the buyer to request a class and time.
            </p>
          )}

          {isSeller && onchainStatus === OrderStatus.Claimed && order.requestedAt && (
            <div className="border border-[color:var(--color-border)] p-5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text)]">
                Mark as delivered
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
                Book the requested class with your credit, add the buyer as a
                guest, then upload proof (booking confirmation/guest-add
                screenshot). Deadline: {new Date(deliveryDeadline!).toLocaleString()}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm text-[color:var(--color-text-dim)] file:mr-4 file:border file:border-[color:var(--color-border)] file:bg-transparent file:px-4 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.15em] file:text-[color:var(--color-text)]"
              />
              <button
                onClick={handleMarkDelivered}
                disabled={busy}
                className="mt-4 bg-[color:var(--color-accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
              >
                Mark delivered
              </button>
            </div>
          )}

          {isBuyer && onchainStatus === OrderStatus.Claimed && now > deliveryDeadline! && (
            <button
              onClick={handleRefund}
              disabled={busy}
              className="w-full border border-[color:var(--color-border)] py-3 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
            >
              Seller never delivered — get refund
            </button>
          )}

          {isBuyer && onchainStatus === OrderStatus.Delivered && (
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="w-full bg-[color:var(--color-accent)] py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
              >
                Confirm — I&apos;m booked in for this class
              </button>

              {now < confirmDeadline! && (
                <div>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="What went wrong?"
                    className="input"
                    rows={2}
                  />
                  <button
                    onClick={handleDispute}
                    disabled={busy}
                    className="mt-2 w-full border border-[color:var(--color-accent)] py-3 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent)] disabled:opacity-40"
                  >
                    Raise a dispute
                  </button>
                </div>
              )}
            </div>
          )}

          {onchainStatus === OrderStatus.Delivered && now > confirmDeadline! && (
            <button
              onClick={handleAutoRelease}
              disabled={busy}
              className="w-full border border-[color:var(--color-border)] py-3 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
            >
              Confirm window elapsed — release funds to seller
            </button>
          )}

          {onchainStatus === OrderStatus.Disputed && (
            <p className="border border-[color:var(--color-accent-muted)] bg-[color:var(--color-accent-muted)]/20 p-5 text-sm text-[color:var(--color-text-dim)]">
              This order is under review. An arbiter will resolve it based on
              the proof images and reason submitted.
              {order.dispute?.reason && (
                <span className="mt-2 block italic text-[color:var(--color-text)]">
                  &ldquo;{order.dispute.reason}&rdquo;
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
