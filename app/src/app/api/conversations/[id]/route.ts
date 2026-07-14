import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wallet = new URL(req.url).searchParams.get("wallet");

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const otherWallet =
    conversation.walletA === wallet ? conversation.walletB : conversation.walletA;
  const profile = await prisma.user.findUnique({ where: { walletAddress: otherWallet } });

  return NextResponse.json({
    id: conversation.id,
    orderId: conversation.orderId,
    otherWallet,
    otherUsername: profile?.username ?? null,
    otherDisplayName: profile?.displayName ?? null,
    otherProfileImageUrl: profile?.profileImageUrl ?? null,
  });
}
