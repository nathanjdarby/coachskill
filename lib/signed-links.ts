import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

// Links for people without an account: `<id>-<signature>`. The signature covers the
// row id and a random per-row secret, so the same link can be emailed again (and
// copied by the admin) while replacing the secret revokes every earlier copy.

type Kind = "appointment" | "booking" | "attend";

function key() {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET is required for signed links.");
  return createHash("sha256").update(`signed-links:${secret}`).digest();
}

function sign(kind: Kind, id: number, rowSecret: string) {
  return createHmac("sha256", key()).update(`${kind}:${id}:${rowSecret}`).digest("base64url").slice(0, 32);
}

/** A fresh random secret to store on the row. */
export function newLinkSecret() {
  return randomBytes(24).toString("base64url");
}

export function signedToken(kind: Kind, id: number, rowSecret: string) {
  return `${id}-${sign(kind, id, rowSecret)}`;
}

/** The row id a token claims to be for, before checking the signature. */
export function tokenId(token: string) {
  const m = /^(\d{1,10})-([A-Za-z0-9_-]{32})$/.exec(token);
  return m ? Number(m[1]) : null;
}

export function verifyToken(kind: Kind, token: string, id: number, rowSecret: string | null) {
  if (!rowSecret) return false;
  const expected = Buffer.from(signedToken(kind, id, rowSecret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
