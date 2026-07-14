import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { keccak256 } from "viem";
import { NextResponse } from "next/server";

// Local-disk stand-in for the S3/IPFS proof storage described in DESIGN.md §7.
// Swap this for an S3 (or web3.storage) upload before shipping past a prototype.
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = keccak256(bytes);

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${hash}.${ext}`;
  await writeFile(join(uploadsDir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}`, hash });
}
