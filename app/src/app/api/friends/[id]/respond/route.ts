import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const friendship = await prisma.friendship.update({
    where: { id },
    data: { status: action === "accept" ? "accepted" : "declined", respondedAt: new Date() },
  });

  return NextResponse.json(friendship);
}
