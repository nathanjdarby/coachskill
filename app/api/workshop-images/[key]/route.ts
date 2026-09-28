import fs from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workshopProgrammes } from "@/lib/db/schema";
import { storedPath } from "@/lib/uploads";

const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

// Public: only serves images that a workshop currently uses.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key;
  const mime = IMAGE_TYPES[key.split(".").pop() ?? ""];
  const file = storedPath(key);
  if (!mime || !file) return new NextResponse("Not found", { status: 404 });

  const [used] = await getDb()
    .select({ id: workshopProgrammes.id })
    .from(workshopProgrammes)
    .where(eq(workshopProgrammes.imageKey, key))
    .limit(1);
  if (!used || !fs.existsSync(file)) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(fs.statSync(file).size),
      "X-Content-Type-Options": "nosniff",
      // Keys are random and never reused, so the image can be cached for good.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
