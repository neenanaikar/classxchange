"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

type ConversationEntry = {
  id: string;
  otherWallet: string;
  otherUsername: string | null;
  otherDisplayName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
};

export default function MessagesPage() {
  const { address } = useAccount();
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    fetch(`/api/conversations?wallet=${address}`)
      .then((r) => r.json())
      .then(setConversations)
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Sign in to see your messages.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-heading text-3xl uppercase tracking-tight text-[color:var(--color-text)]">
        Messages
      </h1>

      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--color-text-dim)]">Loading...</p>
      ) : conversations.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--color-text-dim)]">No conversations yet.</p>
      ) : (
        <div className="mt-8 border-t border-[color:var(--color-border)]">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center justify-between border-b border-[color:var(--color-border)] px-2 py-4 hover:bg-[color:var(--color-surface)]"
            >
              <div>
                <p className="text-sm text-[color:var(--color-text)]">
                  {c.otherDisplayName || c.otherUsername || `${c.otherWallet.slice(0, 8)}...`}
                </p>
                {c.lastMessage && (
                  <p className="mt-1 text-xs text-[color:var(--color-text-dim)]">{c.lastMessage}</p>
                )}
              </div>
              <span className="text-[11px] text-[color:var(--color-text-dim)]">
                {new Date(c.lastMessageAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
