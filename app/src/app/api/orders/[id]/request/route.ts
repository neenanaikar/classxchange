import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { requestedAt, requestedNote } = await req.json();

  if (!requestedAt) {
    return NextResponse.json({ error: "missing requestedAt" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      requestedAt: new Date(requestedAt),
      requestedNote: requestedNote ?? "",
    },
  });

  return NextResponse.json(order);
}
