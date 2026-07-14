import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { winner, note } = await req.json();

  if (winner !== "buyer" && winner !== "seller") {
    return NextResponse.json({ error: "invalid winner" }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { orderId: id },
      data: { resolvedWinner: winner, resolutionNote: note ?? "", resolvedAt: new Date() },
    });
    return tx.order.update({
      where: { id },
      data: { status: winner === "buyer" ? "resolved_buyer" : "resolved_seller" },
    });
  });

  return NextResponse.json(order);
}
