import "server-only";
import { formatDateTime } from "@/lib/time";

// Transactional email via the Resend REST API. Without RESEND_API_KEY, emails
// are logged to the server console instead (handy in development) and callers
// fall back to showing links on screen.

const DEFAULT_FROM = "Monika at Coach Skill <monika@mail.coachskill.co.uk>";

export type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function sendEmail(input: { to: string | string[]; subject: string; heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }): Promise<SendResult> {
  const html = renderHtml(input);
  const text = [
    input.heading,
    ...input.paragraphs,
    input.button ? `${input.button.label}: ${input.button.url}` : "",
    input.footnote ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(`[email not sent: RESEND_API_KEY missing] to=${input.to} subject="${input.subject}"\n${text}`);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
        to: input.to,
        subject: input.subject,
        html,
        text,
        ...(process.env.EMAIL_REPLY_TO?.trim() ? { reply_to: process.env.EMAIL_REPLY_TO.trim() } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text()}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend send failed", err);
    return { ok: false, reason: "failed" };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(input: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155">${escapeHtml(t)}</p>`;
  const button = input.button
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#2563eb;color:#ffffff;font-weight:600;font-size:16px;text-decoration:none">${escapeHtml(input.button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b">Or paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(input.button.url)}</span></p>`
    : "";
  const footnote = input.footnote ? `<p style="margin:24px 0 0;font-size:13px;color:#64748b">${escapeHtml(input.footnote)}</p>` : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:36px">
<tr><td>
<p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#0891b2">Coach Skill</p>
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0f172a">${escapeHtml(input.heading)}</h1>
${input.paragraphs.map(p).join("")}
${button}
${footnote}
<p style="margin:32px 0 0;font-size:15px;color:#334155">Monika Kozlowska<br><span style="color:#64748b">Coach Skill</span></p>
</td></tr></table>
</td></tr></table></body></html>`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function emailPortalInvite(input: { to: string; name: string; url: string; role: "admin" | "client" }) {
  if (input.role === "admin") {
    return sendEmail({
      to: input.to,
      subject: "Your Coach Skill admin account",
      heading: `Hi ${firstName(input.name)}, your admin account is ready`,
      paragraphs: ["Set a password to start using the Coach Skill admin area."],
      button: { label: "Set your password", url: input.url },
      footnote: "This link works once and expires in 7 days.",
    });
  }
  return sendEmail({
    to: input.to,
    subject: "Welcome to your Coach Skill client area",
    heading: `Welcome, ${firstName(input.name)}!`,
    paragraphs: [
      "I'm really looking forward to working with you. I've set up your own private client area where you'll find your goals, our sessions, updates from me, and a place to message me directly.",
      "Create your password to get started:",
    ],
    button: { label: "Create my account", url: input.url },
    footnote: "This link works once and expires in 7 days. If it has expired, just reply and I'll send you a new one.",
  });
}

export function emailPasswordReset(input: { to: string; name: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Reset your Coach Skill password",
    heading: `Hi ${firstName(input.name)}, reset your password`,
    paragraphs: ["We received a request to reset your password. Use the button below to choose a new one."],
    button: { label: "Reset password", url: input.url },
    footnote: "This link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email.",
  });
}

export function emailNewMessageToClient(input: { to: string; name: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "New message from Monika",
    heading: `Hi ${firstName(input.name)}, you have a new message`,
    paragraphs: ["I've sent you a message in your Coach Skill client area."],
    button: { label: "Read message", url: input.url },
  });
}

export function emailNewMessageToAdmins(input: { to: string[]; clientName: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `New message from ${input.clientName}`,
    heading: `${input.clientName} sent a message`,
    paragraphs: ["There's a new message waiting in the client portal."],
    button: { label: "Open conversation", url: input.url },
  });
}

export function emailSharedUpdate(input: { to: string; name: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "A new update from Monika",
    heading: `Hi ${firstName(input.name)}, I've shared an update`,
    paragraphs: ["There's a new update for you in your Coach Skill client area."],
    button: { label: "View update", url: input.url },
  });
}

export function emailSessionBooked(input: { to: string; name: string; title: string; startsAt: Date; durationMinutes: number; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `Session booked: ${formatDateTime(input.startsAt)}`,
    heading: `Hi ${firstName(input.name)}, our next session is booked`,
    paragraphs: [`${input.title} — ${formatDateTime(input.startsAt)} (UK time), ${input.durationMinutes} minutes.`],
    button: { label: "View in your client area", url: input.url },
  });
}
