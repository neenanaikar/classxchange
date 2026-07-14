import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ListingRow } from "@/components/ListingCard";
import { unitsToUsdc } from "@/lib/format";

export const dynamic = "force-dynamic";

type BrowseRow = {
  studio: string;
  meta: string;
  expires: string;
  soon: boolean;
  bond: string | null;
  price: string;
};

const sampleRows: BrowseRow[] = [
  {
    studio: "Barry's",
    meta: "Lift x Run · SoHo",
    expires: "expires in 5 days",
    soon: false,
    bond: "+ $10 seller bond",
    price: "$28",
  },
  {
    studio: "[solidcore]",
    meta: "Full50 · Flatiron",
    expires: "expires in 2 days",
    soon: true,
    bond: null,
    price: "$22",
  },
  {
    studio: "SoulCycle",
    meta: "Rhythm Ride · UWS",
    expires: "expires in 9 days",
    soon: false,
    bond: null,
    price: "$30",
  },
];

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active", onchainId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  const hasListings = listings.length > 0;
  const browseRows: BrowseRow[] = hasListings
    ? listings.slice(0, 3).map((l) => {
        const days = Math.ceil(
          (l.expiresAt.getTime() - Date.now()) / 86_400_000
        );
        return {
          studio: l.studio,
          meta: [l.classType ?? "Any class", l.location]
            .filter(Boolean)
            .join(" · "),
          expires:
            days > 0 ? `expires in ${days} day${days === 1 ? "" : "s"}` : "expired",
          soon: days > 0 && days <= 3,
          bond: l.bondUsdc > 0 ? `+ $${unitsToUsdc(l.bondUsdc)} seller bond` : null,
          price: `$${unitsToUsdc(l.priceUsdc)}`,
        };
      })
    : sampleRows;

  return (
    <div>
      <section className="relative overflow-hidden px-8 py-22 sm:px-12">
        <Image
          src="https://images.pexels.com/photos/18499500/pexels-photo-18499500.png?cs=srgb&dl=pexels-lngdik23-18499500.jpg&fm=jpg"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-[85%_75%] grayscale brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/45" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "inset 0 0 120px 30px rgba(0,0,0,0.55)",
          }}
        />
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[color:var(--color-accent-muted)] opacity-60 blur-[100px]" />

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent-alt)]">
            Peer to peer &middot; escrow protected
          </p>
          <h1 className="font-hero mt-4 max-w-3xl uppercase leading-[0.92] tracking-tight text-[color:var(--color-text)]">
            <span className="block text-6xl sm:text-7xl">
              Take the{" "}
              <span
                style={{
                  textShadow:
                    "0 0 14px var(--color-accent), 0 0 34px var(--color-accent), 0 0 70px var(--color-accent-alt)",
                }}
              >
                class
              </span>
            </span>
            <span className="mt-1 block text-4xl sm:text-5xl">
              someone else can&rsquo;t
            </span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-[color:var(--color-text-dim)]">
            Buy unused boutique fitness credits from people who can&rsquo;t make
            their class. Funds sit in escrow until you confirm you&rsquo;re
            booked in &mdash; got a credit to spare? List it in seconds.
          </p>
          <a
            href="#listings"
            className="mt-8 inline-block bg-[color:var(--color-accent)] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010]"
          >
            Browse classes
          </a>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-alt)] px-8 py-20 sm:px-12">
        <div className="pointer-events-none absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-[color:var(--color-accent-muted)] opacity-50 blur-[130px]" />

        <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent-alt)]">
              How it works
            </p>
            <h2 className="font-heading mt-3 text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
              Studios won&rsquo;t transfer credits. We work around it &mdash; safely.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-text-dim)]">
              The seller keeps their credit and books the exact class you ask for,
              adding you as a guest. Your payment stays locked in an on-chain escrow
              contract &mdash; not the seller&rsquo;s pocket &mdash; until you confirm
              you&rsquo;re booked in.
            </p>

            <ol className="mt-8">
              {[
                {
                  n: "01",
                  title: "Buy & escrow",
                  body: "Pay in USDC. Funds lock into the escrow contract the moment you claim a listing.",
                },
                {
                  n: "02",
                  title: "Request your class",
                  body: "Tell the seller the exact date, time, and location you want to attend.",
                },
                {
                  n: "03",
                  title: "Seller books you in",
                  body: "They book it on their studio account and add you as a guest for that class.",
                },
                {
                  n: "04",
                  title: "Confirm & release",
                  body: "Once you see the booking, confirm to release payment. Not booked? Raise a dispute.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex gap-4 border-b border-[color:var(--color-border)] py-4 last:border-0"
                >
                  <span className="font-heading mt-0.5 shrink-0 text-sm tabular-nums text-[color:var(--color-accent)]">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-heading text-base uppercase tracking-tight text-[color:var(--color-text)]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-text-dim)]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-xs text-[color:var(--color-text-dim)]">
              Sellers can post an optional collateral bond that&rsquo;s forfeited to the
              buyer if they lose a dispute &mdash; and an arbiter resolves anything
              contested either way.
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
              <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent-alt)]">
                  {hasListings ? "Live right now" : "What you’ll browse"}
                </p>
                <span className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
                  {hasListings ? `${listings.length} listed` : "Example"}
                </span>
              </div>

              {browseRows.map((row) => (
                <div
                  key={row.studio}
                  className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-5 last:border-0"
                >
                  <div>
                    <h4 className="font-heading text-lg uppercase tracking-tight text-[color:var(--color-text)]">
                      {row.studio}
                    </h4>
                    <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">
                      {row.meta} &middot;{" "}
                      <span className={row.soon ? "text-[color:var(--color-accent)]" : ""}>
                        {row.expires}
                      </span>
                    </p>
                    {row.bond && (
                      <p className="mt-1 text-[11px] text-[color:var(--color-text-dim)]">
                        {row.bond}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="font-heading text-lg text-[color:var(--color-accent)]">
                      {row.price}
                    </p>
                    <span className="border border-[color:var(--color-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--color-text)]">
                      Buy
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-alt)] px-8 py-10 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-accent-alt)]">
              Got a class you can&rsquo;t make?
            </p>
            <h2 className="font-heading mt-2 text-2xl uppercase tracking-tight text-[color:var(--color-text)]">
              List it before it expires
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--color-text-dim)]">
              Set your price &mdash; the buyer&rsquo;s payment sits in escrow until
              you&rsquo;ve booked them in.
            </p>
          </div>
          <a
            href="/listings/new"
            className="inline-block shrink-0 bg-[color:var(--color-accent)] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010]"
          >
            List a credit
          </a>
        </div>
      </section>

      <section id="listings" className="scroll-mt-20 bg-black">

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
