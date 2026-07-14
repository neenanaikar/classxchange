import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;

  const [user, soldCount, boughtCount] = await Promise.all([
    prisma.user.findUnique({ where: { walletAddress: wallet } }),
    prisma.order.count({
      where: { sellerWallet: wallet, status: { in: ["confirmed", "resolved_seller"] } },
    }),
    prisma.order.count({
      where: { buyerWallet: wallet, status: "confirmed" },
    }),
  ]);

  return NextResponse.json({
    walletAddress: wallet,
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    profileImageUrl: user?.profileImageUrl ?? null,
    favoriteStudio: user?.favoriteStudio ?? null,
    favoriteClass: user?.favoriteClass ?? null,
    soldCount,
    boughtCount,
  });
}
