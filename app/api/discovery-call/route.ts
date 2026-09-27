import { after, NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { discoveryCalls } from "@/lib/db/schema";
import { enquiryRows, enquirySubtitle, missingOrInvalid, sanitizeAnswers } from "@/lib/discovery";
import { emailNewEnquiry } from "@/lib/email";
import { adminEmails } from "@/lib/portal";
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

  let saved;
  try {
    const db = getDb();
    [saved] = await db
      .insert(discoveryCalls)
      .values({
        fullName: answers.fullName,
        email: answers.email.toLowerCase(),
        company: answers.company,
        interests: answers.interests,
        audience: answers.audience,
        // Not asked when it's just for themselves.
        teamSize: answers.audience === "myself" ? "1" : answers.teamSize,
        support: answers.support,
        startTimeline: answers.startTimeline,
        anythingElse: answers.anythingElse ?? null,
        createdAt: new Date(),
      })
      .returning();
  } catch (err) {
    console.error("Discovery call insert failed", err);
    return NextResponse.json(
      { error: "Something went wrong saving your answers. Please try again." },
      { status: 500 },
    );
  }

  // Let Monika know straight away; a failed email mustn't fail the submission.
  after(async () => {
    try {
      const to = await adminEmails();
      if (!to.length || !saved) return;
      await emailNewEnquiry({
        to,
        name: saved.fullName,
        email: saved.email,
        subtitle: enquirySubtitle(saved),
        rows: enquiryRows(saved),
        url: await appUrl(`/admin/discovery#request-${saved.id}`),
      });
    } catch (err) {
      console.error("New enquiry email failed", err);
    }
  });
  return NextResponse.json({ ok: true });
}
