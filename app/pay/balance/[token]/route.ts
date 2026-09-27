import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { createBalanceCheckout } from "@/lib/payments/workshop";
import { verifyBalanceToken } from "@/lib/workshops";

export const dynamic = "force-dynamic";

/** Link from the balance emails: sends the attendee to a fresh Stripe Checkout. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const signupId = verifyBalanceToken((await params).token);
  const workshopPage = await appUrl("/workshop");
  if (signupId == null) return NextResponse.redirect(`${workshopPage}?checkout=invalid_link`, 303);

  const [row] = await getDb()
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(eq(signups.id, signupId))
    .limit(1);
  if (!row || row.signup.status === "declined") {
    return NextResponse.redirect(`${workshopPage}?checkout=invalid_link`, 303);
  }
  if (row.signup.balancePaidAt) return NextResponse.redirect(`${workshopPage}?checkout=balance_paid`, 303);

  try {
    const url = await createBalanceCheckout(row.signup, row.workshop);
    if (url) return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("Balance checkout failed", err);
  }
  return NextResponse.redirect(`${workshopPage}?checkout=error`, 303);
}
