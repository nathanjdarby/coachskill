import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signups } from "@/lib/db/schema";
import { getWorkshopBySlug } from "@/lib/db/queries";

/**
 * n8n HTTP Request node: POST JSON body
 * { "workshopSlug": "value-selling", "name": "...", "email": "...", "id": "unique-id-from-n8n" }
 * Optional: phone, company
 * Auth: Authorization: Bearer <N8N_WEBHOOK_SECRET> or X-Webhook-Secret: <secret>
 */
export async function POST(request: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const headerSecret = request.headers.get("x-webhook-secret")?.trim();
  const provided = bearer ?? headerSecret;
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const workshopSlug =
    typeof o.workshopSlug === "string" ? o.workshopSlug.trim() : null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const emailRaw = typeof o.email === "string" ? o.email.trim() : "";
  const email = emailRaw.toLowerCase();
  const externalId = typeof o.id === "string" ? o.id.trim() : null;

  if (!workshopSlug || !name || !email || !externalId) {
    return NextResponse.json(
      {
        error:
          "workshopSlug, name, email, and id are required (id is used for idempotency)",
      },
      { status: 400 },
    );
  }

  const workshop = await getWorkshopBySlug(workshopSlug);
  if (!workshop) {
    return NextResponse.json(
      { error: `Unknown workshop slug: ${workshopSlug}` },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = new Date();
  const metadata = { ...o };
  delete (metadata as Record<string, unknown>).password;

  const inserted = await db
    .insert(signups)
    .values({
      workshopId: workshop.id,
      name,
      email,
      phone: typeof o.phone === "string" ? o.phone.trim() : null,
      company: typeof o.company === "string" ? o.company.trim() : null,
      metadataJson: JSON.stringify(metadata),
      source: "n8n",
      externalId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [signups.source, signups.externalId] })
    .returning({ id: signups.id });

  if (inserted.length === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  return NextResponse.json({ ok: true, id: inserted[0].id });
}
