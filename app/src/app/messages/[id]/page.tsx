"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

type Message = {
  id: string;
  senderWallet: string;
  body: string;
  createdAt: string;
};

type ConversationInfo = {
  otherWallet: string;
  otherUsername: string | null;
  otherDisplayName: string | null;
};

export default function MessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    setMessages(await res.json());
  }, [id]);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/conversations/${id}?wallet=${address}`)
      .then((r) => r.json())
      .then(setInfo);
    loadMessages();

    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [id, address, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!draft.trim() || !address) return;
    const body = draft;
    setDraft("");
    await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderWallet: address, body }),
    });
    await loadMessages();
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[color:var(--color-text-dim)]">
        Sign in to see this conversation.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col px-6 py-16">
      <h1 className="font-heading text-2xl uppercase tracking-tight text-[color:var(--color-text)]">
        {info?.otherDisplayName || info?.otherUsername || "Conversation"}
      </h1>

      <div className="mt-6 flex-1 space-y-3 border border-[color:var(--color-border)] p-4" style={{ minHeight: 320 }}>
        {messages.map((m) => {
          const isMine = m.senderWallet.toLowerCase() === address.toLowerCase();
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-3 py-2 text-sm ${
                  isMine
                    ? "bg-[color:var(--color-accent)] text-[#1a0010]"
                    : "border border-[color:var(--color-border)] text-[color:var(--color-text)]"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message"
          className="input"
        />
        <button
          onClick={send}
          className="whitespace-nowrap bg-[color:var(--color-accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1a0010]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
