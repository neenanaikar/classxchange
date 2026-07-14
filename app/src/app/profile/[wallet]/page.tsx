"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";

type Profile = {
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  favoriteStudio: string | null;
  favoriteClass: string | null;
  soldCount: number;
  boughtCount: number;
};

type FriendEntry = {
  friendshipId: string;
  wallet: string;
};

type FriendStatus = "none" | "pending" | "friends" | "incoming";

export default function PublicProfilePage() {
  const { wallet } = useParams<{ wallet: string }>();
  const { address } = useAccount();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [incomingFriendshipId, setIncomingFriendshipId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openConversation() {
    if (!address) return;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletA: address, walletB: wallet }),
    });
    const conversation = await res.json();
    router.push(`/messages/${conversation.id}`);
  }

  useEffect(() => {
    fetch(`/api/users/${wallet}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [wallet]);

  useEffect(() => {
    if (!address || address.toLowerCase() === wallet.toLowerCase()) return;
    fetch(`/api/friends?wallet=${address}`)
      .then((r) => r.json())
      .then((data: { accepted: FriendEntry[]; incoming: FriendEntry[]; outgoing: FriendEntry[] }) => {
        if (data.accepted.some((f) => f.wallet.toLowerCase() === wallet.toLowerCase())) {
          setFriendStatus("friends");
        } else if (data.outgoing.some((f) => f.wallet.toLowerCase() === wallet.toLowerCase())) {
          setFriendStatus("pending");
        } else {
          const incomingMatch = data.incoming.find((f) => f.wallet.toLowerCase() === wallet.toLowerCase());
          if (incomingMatch) {
            setFriendStatus("incoming");
            setIncomingFriendshipId(incomingMatch.friendshipId);
          }
        }
      });
  }, [address, wallet]);

  async function addFriend() {
    if (!address || !profile?.username) return;
    setBusy(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterWallet: address, addresseeUsername: profile.username }),
      });
      if (res.ok) setFriendStatus("pending");
    } finally {
      setBusy(false);
    }
  }

  async function respondToIncoming(action: "accept" | "decline") {
    if (!incomingFriendshipId) return;
    setBusy(true);
    try {
      await fetch(`/api/friends/${incomingFriendshipId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setFriendStatus(action === "accept" ? "friends" : "none");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Loading...
      </div>
    );
  }

  const isOwnProfile = address?.toLowerCase() === wallet.toLowerCase();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="flex items-center gap-5">
        {profile.profileImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={profile.profileImageUrl}
            alt=""
            className="h-20 w-20 border border-[color:var(--color-border)] object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
            <span className="font-heading text-2xl text-[color:var(--color-text-dim)]">
              {(profile.username ?? wallet).slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h1 className="font-heading text-2xl uppercase tracking-tight text-[color:var(--color-text)]">
            {profile.displayName || profile.username || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`}
          </h1>
          {profile.username && (
            <p className="text-sm text-[color:var(--color-text-dim)]">@{profile.username}</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="border border-[color:var(--color-border)] p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
            Classes sold
          </p>
          <p className="mt-1 font-heading text-2xl text-[color:var(--color-accent)]">
            {profile.soldCount}
          </p>
        </div>
        <div className="border border-[color:var(--color-border)] p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
            Classes bought
          </p>
          <p className="mt-1 font-heading text-2xl text-[color:var(--color-accent)]">
            {profile.boughtCount}
          </p>
        </div>
      </div>

      {(profile.favoriteStudio || profile.favoriteClass) && (
        <div className="mt-8 text-sm">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">
            Favorite
          </p>
          <p className="mt-1 text-[color:var(--color-text)]">
            {[profile.favoriteClass, profile.favoriteStudio].filter(Boolean).join(" at ")}
          </p>
        </div>
      )}

      {isOwnProfile && (
        <Link
          href="/profile/edit"
          className="mt-8 inline-block border border-[color:var(--color-border)] px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
        >
          Edit profile
        </Link>
      )}

      {!isOwnProfile && address && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={openConversation}
            className="border border-[color:var(--color-border)] px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
          >
            Message
          </button>
          {profile.username && friendStatus === "none" && (
            <button
              onClick={addFriend}
              disabled={busy}
              className="bg-[color:var(--color-accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
            >
              Add friend
            </button>
          )}
          {friendStatus === "pending" && (
            <span className="text-sm text-[color:var(--color-text-dim)]">Friend request sent</span>
          )}
          {friendStatus === "friends" && (
            <span className="text-sm text-[color:var(--color-text-dim)]">You&apos;re friends</span>
          )}
          {friendStatus === "incoming" && (
            <div className="flex gap-2">
              <button
                onClick={() => respondToIncoming("accept")}
                disabled={busy}
                className="bg-[color:var(--color-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010] disabled:opacity-40"
              >
                Accept request
              </button>
              <button
                onClick={() => respondToIncoming("decline")}
                disabled={busy}
                className="border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-text)] disabled:opacity-40"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
