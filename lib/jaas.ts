import "server-only";
import { createPrivateKey, createSign, type KeyObject } from "crypto";

// 8x8 JaaS (Jitsi as a Service): the in-app meeting room. Switched on by setting
// JAAS_APP_ID, JAAS_API_KEY_ID and JAAS_PRIVATE_KEY; without them the site keeps
// using plain meet.jit.si links. Room names are the ones already in each booking's
// meet.jit.si link (CoachSkill-…), so existing bookings move over automatically.

type JaasConfig = { appId: string; keyId: string; key: KeyObject };

let cached: { raw: string; config: JaasConfig | null } | undefined;

export function jaasConfig(): JaasConfig | null {
  const appId = process.env.JAAS_APP_ID?.trim();
  const keyId = process.env.JAAS_API_KEY_ID?.trim();
  const pem = process.env.JAAS_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");
  const raw = `${appId}|${keyId}|${pem}`;
  if (cached?.raw === raw) return cached.config;
  let config: JaasConfig | null = null;
  if (appId && keyId && pem) {
    try {
      config = { appId, keyId, key: createPrivateKey(pem) };
    } catch (err) {
      console.error("JAAS_PRIVATE_KEY couldn't be read; the in-app meeting room is off.", err);
    }
  }
  cached = { raw, config };
  return config;
}

export function jaasEnabled() {
  return jaasConfig() !== null;
}

/** The room name inside a meet.jit.si link (https://meet.jit.si/CoachSkill-abc → CoachSkill-abc). */
export function roomNameFrom(meetingUrl: string | null | undefined) {
  const m = /^https:\/\/meet\.jit\.si\/([A-Za-z0-9_-]{8,120})(?:[?#].*)?$/.exec(meetingUrl ?? "");
  return m ? m[1] : null;
}

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * A short-lived token for one room. Moderators (Monika) run the call; guests can join
 * but not control it. See https://developer.8x8.com/jaas/docs/api-keys-jwt
 */
export function jaasToken(input: {
  room: string;
  user: { id: string; name: string; email?: string | null };
  moderator: boolean;
  expiresAt: Date;
}) {
  const config = jaasConfig();
  if (!config) throw new Error("JaaS isn't configured.");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: config.keyId, typ: "JWT" };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: config.appId,
    room: input.room,
    iat: now,
    nbf: now - 60,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    context: {
      user: {
        id: input.user.id,
        name: input.user.name,
        email: input.user.email ?? "",
        moderator: input.moderator ? "true" : "false",
      },
      features: { livestreaming: "false", recording: "false", transcription: "false", "outbound-call": "false" },
    },
  };
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.key).toString("base64url");
  return `${unsigned}.${signature}`;
}

/** What the browser needs to open a room. */
export function roomSetup(input: Parameters<typeof jaasToken>[0]) {
  const config = jaasConfig()!;
  const jwt = jaasToken(input);
  return {
    appId: config.appId,
    roomName: `${config.appId}/${input.room}`,
    jwt,
    /** Fallback for browsers where the embedded room misbehaves. */
    directUrl: `https://8x8.vc/${config.appId}/${input.room}?jwt=${jwt}`,
  };
}
