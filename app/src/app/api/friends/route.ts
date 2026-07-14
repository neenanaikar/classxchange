import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "missing wallet" }, { status: 400 });
  }

  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterWallet: wallet }, { addresseeWallet: wallet }],
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.addresseeWallet === wallet);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requesterWallet === wallet);

  const otherWallets = (list: typeof rows) =>
    list.map((r) => (r.requesterWallet === wallet ? r.addresseeWallet : r.requesterWallet));

  const allWallets = [
    ...otherWallets(accepted),
    ...otherWallets(incoming),
    ...otherWallets(outgoing),
  ];

  const profiles = await prisma.user.findMany({
    where: { walletAddress: { in: allWallets } },
  });
  const profileByWallet = new Map(profiles.map((p) => [p.walletAddress, p]));

  const withProfile = (r: (typeof rows)[number]) => {
    const otherWallet = r.requesterWallet === wallet ? r.addresseeWallet : r.requesterWallet;
    return {
      friendshipId: r.id,
      wallet: otherWallet,
      username: profileByWallet.get(otherWallet)?.username ?? null,
      displayName: profileByWallet.get(otherWallet)?.displayName ?? null,
      profileImageUrl: profileByWallet.get(otherWallet)?.profileImageUrl ?? null,
    };
  };

  return NextResponse.json({
    accepted: accepted.map(withProfile),
    incoming: incoming.map(withProfile),
    outgoing: outgoing.map(withProfile),
  });
}
