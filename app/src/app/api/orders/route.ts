import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "missing wallet" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerWallet: { equals: wallet } },
        { sellerWallet: { equals: wallet } },
      ],
    },
    include: { listing: true, dispute: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    onchainId,
    listingId,
    buyerWallet,
    sellerWallet,
    amountUsdc,
    deliveryDeadline,
  } = body;

  if (
    onchainId === undefined ||
    !listingId ||
    !buyerWallet ||
    !sellerWallet ||
    !amountUsdc
  ) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        onchainId,
        listingId,
        buyerWallet,
        sellerWallet,
        amountUsdc,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : null,
      },
    });
    await tx.listing.update({
      where: { id: listingId },
      data: { status: "claimed" },
    });
    return created;
  });

  return NextResponse.json(order, { status: 201 });
}
