import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { discoveryCalls } from "@/lib/db/schema";
import { missingOrInvalid, sanitizeAnswers } from "@/lib/discovery";
import {
  clientIp,
  countLinks,
  createFormToken,
  rateLimit,
  verifyFormToken,
} from "@/lib/spam";

const MAX_SUBMISSIONS_PER_HOUR = 5;
const MAX_LINKS = 2;

/** Issues a signed form token; the flow fetches one when it loads. */
export async function GET() {
  return NextResponse.json(
    { token: createFormToken() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Public discovery call form submission.
 * Body: { answers: {...}, token: string, website?: string (honeypot) }
 * Suspected spam gets a normal success response but is not stored.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as { answers?: unknown; token?: unknown; website?: unknown };

  if (!rateLimit(`discovery:${clientIp(request.headers)}`, MAX_SUBMISSIONS_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  const tokenCheck = verifyFormToken(b.token);
  if (tokenCheck === "invalid" || tokenCheck === "expired") {
    return NextResponse.json(
      { error: "This form has expired. Please press send again.", code: "token" },
      { status: 400 },
    );
  }

  const answers = sanitizeAnswers(b.answers);
  const problems = missingOrInvalid(answers);
  if (problems.length) {
    return NextResponse.json(
      {
        error: "A few questions still need an answer.",
        missing: problems.map((q) => q.id),
      },
      { status: 400 },
    );
  }

  const honeypotFilled = typeof b.website === "string" && b.website.trim() !== "";
  const tooManyLinks = countLinks(Object.values(answers)) > MAX_LINKS;
  if (honeypotFilled || tokenCheck === "too_fast" || tooManyLinks) {
    console.warn("Discovery call dropped as spam", {
      honeypotFilled,
      tooFast: tokenCheck === "too_fast",
      tooManyLinks,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getDb();
    await db.insert(discoveryCalls).values({
      fullName: answers.fullName,
      email: answers.email.toLowerCase(),
      company: answers.company,
      persona: answers.persona as "professional" | "business_owner" | "corporate",
      goal: answers.goal,
      challenges: answers.challenges,
      anythingElse: answers.anythingElse ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Discovery call insert failed", err);
    return NextResponse.json(
      { error: "Something went wrong saving your answers. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
