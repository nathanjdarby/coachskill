import fs from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/dal";
import { clientCanAccess, getResource } from "@/lib/resources";
import { isInline, storedPath } from "@/lib/uploads";

// /api is outside the auth middleware, so this route checks access itself.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("Please sign in", { status: 401 });

  const id = Number((await params).id);
  const resource = Number.isInteger(id) ? await getResource(id) : null;
  if (!resource || resource.kind !== "file" || !resource.storageKey) return new NextResponse("Not found", { status: 404 });

  const allowed = user.role === "admin" || (user.clientId != null && (await clientCanAccess(user.clientId, resource.id)));
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const file = storedPath(resource.storageKey);
  if (!file || !fs.existsSync(file)) return new NextResponse("File missing", { status: 404 });

  const name = (resource.originalName ?? "file").replace(/[^\w.\- ]+/g, "_");
  const disposition = isInline(resource.mimeType) ? "inline" : "attachment";
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": resource.mimeType ?? "application/octet-stream",
      "Content-Length": String(fs.statSync(file).size),
      "Content-Disposition": `${disposition}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(resource.originalName ?? "file")}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
