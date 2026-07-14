import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { senderWallet, body } = await req.json();

  if (!senderWallet || !body?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { conversationId: id, senderWallet, body: body.trim() },
  });

  return NextResponse.json(message, { status: 201 });
}
