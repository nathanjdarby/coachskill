import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

// Spam protection for public forms: signed time-stamped form tokens, a
// per-IP rate limit, and simple content checks. Server-only.

const TOKEN_MIN_AGE_MS = 4_000;
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let fallbackKey: Buffer | undefined;

function signingKey(): Buffer {
  const secret = getAuthSecret();
  if (secret) {
    return createHash("sha256").update(`form-token:${secret}`).digest();
  }
  // Without AUTH_SECRET, tokens only survive until the server restarts.
  if (!fallbackKey) {
    console.warn("AUTH_SECRET not set: form tokens use a per-process key.");
    fallbackKey = randomBytes(32);
  }
  return fallbackKey;
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** Token format: `<issuedAtMs>.<nonce>.<signature>` */
export function createFormToken(now = Date.now()): string {
  const payload = `${now}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck = "ok" | "invalid" | "too_fast" | "expired";

export function verifyFormToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== "string") return "invalid";
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid";
  const [issued, nonce, signature] = parts;
  const expected = Buffer.from(sign(`${issued}.${nonce}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return "invalid";
  }
  const age = now - Number(issued);
  if (!Number.isFinite(age) || age < 0) return "invalid";
  if (age < TOKEN_MIN_AGE_MS) return "too_fast";
  if (age > TOKEN_MAX_AGE_MS) return "expired";
  return "ok";
}

// In-memory sliding window. Fine for a single server process (this app uses
// a local SQLite file); a multi-instance deploy would need a shared store.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

export function clientIp(headers: Headers): string {
  // Prefer X-Real-IP: nginx sets it to the connecting address, whereas
  // X-Forwarded-For keeps whatever the client sent and so can be spoofed.
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown"
  );
}

const LINK_RE = /https?:\/\/|www\./gi;

export function countLinks(texts: string[]): number {
  return texts.reduce((n, t) => n + (t.match(LINK_RE)?.length ?? 0), 0);
}
