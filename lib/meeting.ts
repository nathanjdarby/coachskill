import { randomBytes } from "crypto";
import type { EventType } from "@/lib/db/schema";

// Video links for appointments. Every booking gets its own private Jitsi room,
// so no video account or API is needed. Kept in one place so the provider can
// be swapped (8x8 JaaS, self-hosted Jitsi…) without touching callers.

const JITSI_BASE = "https://meet.jit.si";

/** A new, unguessable room link, e.g. https://meet.jit.si/CoachSkill-3f9K… */
export function newJitsiUrl() {
  return `${JITSI_BASE}/CoachSkill-${randomBytes(16).toString("base64url")}`;
}

export function isJitsiUrl(url: string | null | undefined) {
  return Boolean(url?.startsWith(`${JITSI_BASE}/`));
}

type LocationSource = Pick<EventType, "locationMode" | "customUrl">;

/** The link for a new appointment: an explicit override, else what the event type says. */
export function resolveMeetingUrl(type: LocationSource | null, override?: string | null) {
  if (override?.trim()) return override.trim();
  if (!type || type.locationMode === "jitsi") return newJitsiUrl();
  if (type.locationMode === "custom") return type.customUrl ?? null;
  return null;
}

/** How to join, for emails: public Jitsi rooms open once Monika (signed in) joins. */
export function joinNote(url: string | null | undefined, audience: "client" | "admin") {
  if (!isJitsiUrl(url)) return null;
  return audience === "admin"
    ? "Join a few minutes early and sign in when Jitsi asks — the room opens for your guest once you're in."
    : "The link opens a private video room in your browser — no app or account needed. Monika will let you in.";
}
