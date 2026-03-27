import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { signups } from "@/lib/db/schema";
import { getSignupById } from "@/lib/db/queries";
import { eq } from "drizzle-orm";

const STATUSES = ["pending", "accepted", "on_hold", "declined"] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const status = o.status;
  const notes = o.notes;

  if (typeof status !== "string" || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json(
      { error: "status must be one of: pending, accepted, on_hold, declined" },
      { status: 400 },
    );
  }

  const existing = await getSignupById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const now = new Date();

  const setPayload: {
    status: (typeof STATUSES)[number];
    updatedAt: Date;
    notes?: string | null;
  } = {
    status: status as (typeof STATUSES)[number],
    updatedAt: now,
  };
  if (notes !== undefined) {
    setPayload.notes = typeof notes === "string" ? notes : null;
  }

  await db.update(signups).set(setPayload).where(eq(signups.id, id));

  const updated = await getSignupById(id);
  return NextResponse.json({ signup: updated });
}
