import { after, NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { appUrl } from "@/lib/app-url";
import { currentUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { resources, resourceShares } from "@/lib/db/schema";
import { emailNewResource } from "@/lib/email";
import { parseShare } from "@/lib/resource-shares";
import { recipientsFor } from "@/lib/resources";
import { deleteUpload, saveUpload, type SavedFile } from "@/lib/uploads";

// A route handler rather than a server action: actions cap request bodies at 1 MB.
export async function POST(request: NextRequest) {
  const admin = await currentUser();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload didn't come through. Is the file too large?" }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  const kind = form.get("kind") === "link" ? "link" : "file";
  const url = String(form.get("url") ?? "").trim().slice(0, 1000);
  if (!title) errors.title = "Give it a title.";
  if (kind === "link" && !/^https:\/\/\S+$/.test(url)) errors.url = "Use a full https:// link.";
  const share = await parseShare(form);
  if ("error" in share) errors.scope = share.error;

  const file = form.get("file");
  if (kind === "file" && !(file instanceof File && file.size > 0)) errors.file = "Choose a file.";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });

  let saved: SavedFile | null = null;
  if (kind === "file") {
    const result = await saveUpload(file as File);
    if ("error" in result) return NextResponse.json({ errors: { file: result.error } }, { status: 400 });
    saved = result;
  }

  const now = new Date();
  let resourceId: number;
  try {
    const db = getDb();
    resourceId = db.transaction(() => {
      const created = db
        .insert(resources)
        .values({
          title,
          description: description || null,
          kind,
          storageKey: saved?.storageKey ?? null,
          originalName: saved?.originalName ?? null,
          mimeType: saved?.mimeType ?? null,
          sizeBytes: saved?.sizeBytes ?? null,
          url: kind === "link" ? url : null,
          createdById: admin.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
      if (!("error" in share)) db.insert(resourceShares).values({ resourceId: created.id, ...share }).run();
      return created.id;
    });
  } catch (err) {
    if (saved) await deleteUpload(saved.storageKey);
    throw err;
  }

  if (form.get("notify") === "on" && !("error" in share)) {
    const [people, link] = await Promise.all([recipientsFor(share), appUrl("/portal/resources")]);
    after(async () => {
      for (const p of people) await emailNewResource({ to: p.email, name: p.name, title, url: link });
    });
  }

  revalidatePath("/admin/resources");
  revalidatePath("/portal/resources");
  return NextResponse.json({ ok: true, id: resourceId, message: "Shared." });
}
