"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function NavBar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { address } = useAccount();

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="whitespace-nowrap font-logo text-2xl uppercase tracking-wide text-[color:var(--color-text)]"
        >
          Classxchange
        </Link>

        <nav className="flex items-center gap-4 sm:gap-7">
          <Link
            href="/"
            className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
          >
            Browse
          </Link>
          <Link
            href="/listings/new"
            className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
          >
            List a credit
          </Link>
          <Link
            href="/orders"
            className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
          >
            My orders
          </Link>

          {!ready ? null : authenticated ? (
            <div className="flex items-center gap-3">
              {address && (
                <>
                  <Link
                    href={`/profile/${address}`}
                    className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/friends"
                    className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
                  >
                    Friends
                  </Link>
                  <Link
                    href="/messages"
                    className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] sm:inline"
                  >
                    Messages
                  </Link>
                </>
              )}
              <span className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)] md:inline">
                {user?.email?.address ?? user?.phone?.number ?? "Signed in"}
              </span>
              <button
                onClick={logout}
                className="whitespace-nowrap border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-text-dim)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="whitespace-nowrap bg-[color:var(--color-accent)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010]"
            >
              Get started
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
