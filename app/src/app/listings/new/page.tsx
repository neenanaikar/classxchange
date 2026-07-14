"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { usdcToUnits } from "@/lib/format";
import { createListingOnChain } from "@/lib/actions";

export default function NewListingPage() {
  const { address } = useAccount();
  const router = useRouter();

  const [studio, setStudio] = useState("");
  const [classType, setClassType] = useState("");
  const [location, setLocation] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [price, setPrice] = useState("");
  const [bond, setBond] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address) {
      setError("Sign in first.");
      return;
    }
    if (!proofFile) {
      setError("Upload a screenshot of your class balance/expiration.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url: proofImageUrl, hash: proofHash } = await uploadRes.json();

      const priceUnits = usdcToUnits(price);
      const bondUnits = bond ? usdcToUnits(bond) : 0n;

      const { listingId } = await createListingOnChain({
        owner: address,
        price: priceUnits,
        bond: bondUnits,
        proofHash,
      });

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onchainId: Number(listingId),
          sellerWallet: address,
          studio,
          classType,
          location,
          expiresAt: new Date(expiresAt).toISOString(),
          priceUsdc: Number(priceUnits),
          bondUsdc: Number(bondUnits),
          proofImageUrl,
          proofHash,
        }),
      });
      if (!res.ok) throw new Error("Failed to save listing");

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        List a class credit
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-dim)]">
        Upload proof of your class balance and expiration date. This gets
        hashed and committed on-chain so it can&apos;t be swapped later, and the
        buyer only pays into escrow — you get paid once they confirm the class
        actually shows up in their account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Studio">
          <input
            required
            value={studio}
            onChange={(e) => setStudio(e.target.value)}
            placeholder="Barry's Bootcamp"
            className="input"
          />
        </Field>

        <Field label="Class type restrictions (optional)">
          <input
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
            placeholder="Any class"
            className="input"
          />
          <p className="mt-2 text-xs text-[color:var(--color-text-dim)]">
            Leave blank if this credit works for any class. The buyer will
            request a specific date and time after they claim it.
          </p>
        </Field>

        <Field label="Location (optional)">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Chelsea, NYC"
            className="input"
          />
        </Field>

        <Field label="Credit expires on">
          <input
            required
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Price (USDC)">
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="20.00"
            className="input"
          />
        </Field>

        <Field label="Optional collateral bond (USDC)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            placeholder="0"
            className="input"
          />
          <p className="mt-2 text-xs text-[color:var(--color-text-dim)]">
            Posting a bond builds trust with buyers — it&apos;s forfeited to
            them if you lose a dispute, and returned once the listing sells through.
          </p>
        </Field>

        <Field label="Proof of class balance/expiration">
          <input
            required
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[color:var(--color-text-dim)] file:mr-4 file:border file:border-[color:var(--color-border)] file:bg-transparent file:px-4 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.15em] file:text-[color:var(--color-text)]"
          />
        </Field>

        {error && <p className="text-sm text-[color:var(--color-accent)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !address}
          className="w-full bg-[color:var(--color-accent)] py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
        >
          {!address ? "Sign in to continue" : submitting ? "Creating listing..." : "Create listing"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
        {label}
      </span>
      {children}
    </label>
  );
}
