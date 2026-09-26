import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { discoveryCalls } from "@/lib/db/schema";
import { missingOrInvalid, sanitizeAnswers } from "@/lib/discovery";

/**
 * Public discovery call form submission.
 * Body: { answers: { fullName, email, company, persona, goal, challenges, anythingElse? } }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const answers = sanitizeAnswers((body as { answers?: unknown })?.answers);
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
