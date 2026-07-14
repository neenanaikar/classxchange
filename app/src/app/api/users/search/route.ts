import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: { username: { contains: q } },
    take: 10,
    select: { walletAddress: true, username: true, displayName: true, profileImageUrl: true },
  });

  return NextResponse.json(users);
}
