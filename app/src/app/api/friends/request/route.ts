import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { requesterWallet, addresseeUsername } = await req.json();

  if (!requesterWallet || !addresseeUsername) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const addressee = await prisma.user.findUnique({
    where: { username: String(addresseeUsername).trim().toLowerCase() },
  });
  if (!addressee) {
    return NextResponse.json({ error: "no user with that username" }, { status: 404 });
  }
  if (addressee.walletAddress.toLowerCase() === String(requesterWallet).toLowerCase()) {
    return NextResponse.json({ error: "can't friend yourself" }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterWallet, addresseeWallet: addressee.walletAddress },
        { requesterWallet: addressee.walletAddress, addresseeWallet: requesterWallet },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "friendship already exists", status: existing.status }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterWallet, addresseeWallet: addressee.walletAddress },
  });

  return NextResponse.json(friendship, { status: 201 });
}
