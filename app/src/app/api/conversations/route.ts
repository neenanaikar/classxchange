import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalize(walletA: string, walletB: string) {
  return walletA.toLowerCase() < walletB.toLowerCase()
    ? [walletA, walletB]
    : [walletB, walletA];
}

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "missing wallet" }, { status: 400 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ walletA: wallet }, { walletB: wallet }] },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const otherWallets = conversations.map((c) => (c.walletA === wallet ? c.walletB : c.walletA));
  const profiles = await prisma.user.findMany({ where: { walletAddress: { in: otherWallets } } });
  const profileByWallet = new Map(profiles.map((p) => [p.walletAddress, p]));

  const result = conversations.map((c) => {
    const otherWallet = c.walletA === wallet ? c.walletB : c.walletA;
    const profile = profileByWallet.get(otherWallet);
    return {
      id: c.id,
      otherWallet,
      otherUsername: profile?.username ?? null,
      otherDisplayName: profile?.displayName ?? null,
      otherProfileImageUrl: profile?.profileImageUrl ?? null,
      lastMessage: c.messages[0]?.body ?? null,
      lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { walletA, walletB, orderId } = await req.json();
  if (!walletA || !walletB) {
    return NextResponse.json({ error: "missing wallets" }, { status: 400 });
  }

  const [a, b] = normalize(walletA, walletB);

  const conversation = await prisma.conversation.upsert({
    where: { walletA_walletB: { walletA: a, walletB: b } },
    create: { walletA: a, walletB: b, orderId: orderId ?? null },
    update: {},
  });

  return NextResponse.json(conversation);
}
