import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { raisedBy, reason } = await req.json();

  if (!raisedBy) {
    return NextResponse.json({ error: "missing raisedBy" }, { status: 400 });
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: { orderId: id, raisedBy, reason: reason ?? "" },
    });
    await tx.order.update({ where: { id }, data: { status: "disputed" } });
    return created;
  });

  return NextResponse.json(dispute, { status: 201 });
}
