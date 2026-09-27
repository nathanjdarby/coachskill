import { NextRequest, NextResponse } from "next/server";
import { buildCalendarFeed, isFeedToken } from "@/lib/calendar-feed";
import { clientIp, rateLimit } from "@/lib/spam";

export const dynamic = "force-dynamic";

/** Monika's private calendar feed (subscribe from Google, Apple or Outlook calendar). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`calendar-feed:${clientIp(request.headers)}`, 60, 60 * 60 * 1000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!isFeedToken(token)) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(await buildCalendarFeed(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="coach-skill.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
