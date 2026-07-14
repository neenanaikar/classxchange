import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { listing: true, dispute: true },
  });
  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const order = await prisma.order.update({ where: { id }, data: body });
  return NextResponse.json(order);
}
