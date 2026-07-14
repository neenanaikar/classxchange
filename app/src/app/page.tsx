import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ListingRow } from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active", onchainId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <section className="relative overflow-hidden px-8 py-22 sm:px-12">
        <Image
          src="https://images.pexels.com/photos/18499500/pexels-photo-18499500.png?cs=srgb&dl=pexels-lngdik23-18499500.jpg&fm=jpg"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[color:var(--color-accent-muted)] opacity-70 blur-[100px]" />

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent-alt)]">
            Peer to peer &middot; escrow protected
          </p>
          <h1 className="font-hero mt-4 max-w-3xl text-6xl uppercase leading-[0.92] tracking-tight text-[color:var(--color-text)] sm:text-7xl">
            List classes before they go to waste
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-[color:var(--color-text-dim)]">
            Buy and sell unused boutique fitness credits. Funds sit in escrow
            until you confirm the class actually shows up in your studio
            account.
          </p>
          <a
            href="/listings/new"
            className="mt-8 inline-block bg-[color:var(--color-accent)] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010]"
          >
            List a credit
          </a>
        </div>
      </section>

      <section className="bg-black">
        {listings.length === 0 ? (
          <p className="px-8 py-16 text-sm text-[color:var(--color-text-dim)] sm:px-12">
            No listings yet. Be the first to{" "}
            <a href="/listings/new" className="text-[color:var(--color-accent)] underline">
              list a credit
            </a>
            .
          </p>
        ) : (
          <div className="border-t border-[color:var(--color-border)]">
            {listings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={{
                  ...listing,
                  onchainId: listing.onchainId as number,
                  expiresAt: listing.expiresAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
