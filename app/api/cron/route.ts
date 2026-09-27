import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Scheduled jobs (balance emails, reminders). Triggered by the server's crontab:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDueJobs(new Date());
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}
