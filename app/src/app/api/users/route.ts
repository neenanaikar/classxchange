import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Create or update the caller's own profile. Upsert keyed by wallet — a
// wallet can always place orders before it has a profile, this just fills
// one in (or edits it) when the user opts in.
export async function POST(req: Request) {
  const { walletAddress, username, displayName, profileImageUrl, favoriteStudio, favoriteClass } =
    await req.json();

  if (!walletAddress || !username) {
    return NextResponse.json({ error: "missing walletAddress or username" }, { status: 400 });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    return NextResponse.json(
      { error: "username must be 3-20 characters: letters, numbers, underscore" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (existing && existing.walletAddress.toLowerCase() !== String(walletAddress).toLowerCase()) {
    return NextResponse.json({ error: "username already taken" }, { status: 409 });
  }

  const user = await prisma.user.upsert({
    where: { walletAddress },
    create: {
      walletAddress,
      username: normalizedUsername,
      displayName: displayName || null,
      profileImageUrl: profileImageUrl || null,
      favoriteStudio: favoriteStudio || null,
      favoriteClass: favoriteClass || null,
    },
    update: {
      username: normalizedUsername,
      displayName: displayName || null,
      profileImageUrl: profileImageUrl || null,
      favoriteStudio: favoriteStudio || null,
      favoriteClass: favoriteClass || null,
    },
  });

  return NextResponse.json(user);
}
