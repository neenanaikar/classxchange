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
      <section className="bg-[color:var(--color-background-alt)] px-8 py-22 sm:px-12">
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
