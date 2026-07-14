import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    onchainId,
    sellerWallet,
    studio,
    classType,
    location,
    expiresAt,
    priceUsdc,
    bondUsdc,
    proofImageUrl,
    proofHash,
  } = body;

  if (
    onchainId === undefined ||
    !sellerWallet ||
    !studio ||
    !expiresAt ||
    !priceUsdc ||
    !proofImageUrl ||
    !proofHash
  ) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      onchainId,
      sellerWallet,
      studio,
      classType: classType || null,
      location: location ?? "",
      expiresAt: new Date(expiresAt),
      priceUsdc,
      bondUsdc: bondUsdc ?? 0,
      proofImageUrl,
      proofHash,
    },
  });

  return NextResponse.json(listing, { status: 201 });
}
