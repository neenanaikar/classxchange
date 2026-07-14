"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

type FriendEntry = {
  friendshipId: string;
  wallet: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
};

type SearchResult = {
  walletAddress: string;
  username: string;
  displayName: string | null;
};

export default function FriendsPage() {
  const { address } = useAccount();
  const [accepted, setAccepted] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    const res = await fetch(`/api/friends?wallet=${address}`);
    const data = await res.json();
    setAccepted(data.accepted);
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function sendRequest(username: string) {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterWallet: address, addresseeUsername: username }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send request");
      }
      setQuery("");
      setResults([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setBusy(false);
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setBusy(true);
    try {
      await fetch(`/api/friends/${friendshipId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Sign in to see your friends.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        Friends
      </h1>

      <div className="mt-8">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
          Add a friend by username
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="username"
          className="input"
        />
        {error && <p className="mt-2 text-sm text-[color:var(--color-accent)]">{error}</p>}
        {results.length > 0 && (
          <div className="mt-3 border border-[color:var(--color-border)]">
            {results.map((r) => (
              <div
                key={r.walletAddress}
                className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-[color:var(--color-text)]">
                  {r.displayName || r.username} <span className="text-[color:var(--color-text-dim)]">@{r.username}</span>
                </span>
                <button
                  onClick={() => sendRequest(r.username)}
                  disabled={busy}
                  className="border border-[color:var(--color-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
            Requests
          </h2>
          <div className="mt-3 border border-[color:var(--color-border)]">
            {incoming.map((f) => (
              <div
                key={f.friendshipId}
                className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3 last:border-b-0"
              >
                <Link href={`/profile/${f.wallet}`} className="text-sm text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]">
                  {f.displayName || f.username || f.wallet.slice(0, 8)}
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(f.friendshipId, "accept")}
                    disabled={busy}
                    className="bg-[color:var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1a0010] disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(f.friendshipId, "decline")}
                    disabled={busy}
                    className="border border-[color:var(--color-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text)] disabled:opacity-40"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
          Your friends
        </h2>
        {accepted.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-text-dim)]">No friends yet.</p>
        ) : (
          <div className="mt-3 border border-[color:var(--color-border)]">
            {accepted.map((f) => (
              <Link
                key={f.friendshipId}
                href={`/profile/${f.wallet}`}
                className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3 last:border-b-0 hover:bg-[color:var(--color-surface)]"
              >
                <span className="text-sm text-[color:var(--color-text)]">
                  {f.displayName || f.username || f.wallet.slice(0, 8)}
                </span>
                {f.username && <span className="text-xs text-[color:var(--color-text-dim)]">@{f.username}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {outgoing.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text-dim)]">
            Pending
          </h2>
          <div className="mt-3 border border-[color:var(--color-border)]">
            {outgoing.map((f) => (
              <div key={f.friendshipId} className="border-b border-[color:var(--color-border)] px-4 py-3 text-sm text-[color:var(--color-text-dim)] last:border-b-0">
                {f.displayName || f.username || f.wallet.slice(0, 8)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
