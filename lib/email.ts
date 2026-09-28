import "server-only";
import { joinNote, personalJoinUrl } from "@/lib/meeting";
import { formatPence } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

// Transactional email via the Resend REST API. Without RESEND_API_KEY, emails
// are logged to the server console instead (handy in development) and callers
// fall back to showing links on screen.

const DEFAULT_FROM = "Monika at Coach Skill <monika@mail.coachskill.co.uk>";

export type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type EmailAttachment = { filename: string; content: string; contentType?: string };

async function sendEmail(input: {
  to: string | string[];
  subject: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footnote?: string;
  attachments?: EmailAttachment[];
  /** Overrides EMAIL_REPLY_TO, e.g. so replying to an enquiry alert reaches the enquirer. */
  replyTo?: string;
}): Promise<SendResult> {
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
        ...((input.replyTo ?? process.env.EMAIL_REPLY_TO?.trim()) ? { reply_to: input.replyTo ?? process.env.EMAIL_REPLY_TO?.trim() } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
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

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || "https://coachskill.co.uk";
/** Added under join links: a quick camera and microphone check before the call. */
const setupLine = `Want to check your camera and microphone first? ${SITE_URL}/check-setup`;

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

type SessionEmail = {
  to: string;
  name: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  url: string;
  meetingUrl?: string | null;
  attachments?: EmailAttachment[];
  /** A prospect without a client account: `url` is their manage link. */
  guest?: boolean;
  /** Their own join link (in-app room or personalised Jitsi link); worked out here if missing. */
  joinUrl?: string | null;
  /** A phone call: the number Monika will ring (no join link). */
  phone?: string | null;
};

/** Clients know them as sessions; prospects see the call's own name. */
const subjectName = (s: SessionEmail) => (s.guest ? s.title : "Session");

const viewButton = (s: SessionEmail) => ({ label: s.guest ? "View or change your booking" : "View in your client area", url: s.url });

function sessionLine(s: SessionEmail) {
  return `${s.title} — ${formatDateTime(s.startsAt)} (UK time), ${s.durationMinutes} minutes.`;
}

/** The recipient's own join link: their name filled in and the room titled. */
const sessionJoinUrl = (s: SessionEmail) => s.joinUrl ?? personalJoinUrl(s.meetingUrl, { name: s.name, subject: s.title });

function meetingLine(s: SessionEmail) {
  if (s.phone) return [`It's a phone call — Monika will ring you on ${s.phone}.`, "Need a different number? Just reply to this email."];
  if (!s.meetingUrl) return [];
  const note = joinNote(s.meetingUrl, "client");
  return [`Join here: ${sessionJoinUrl(s)}`, ...(note ? [note] : []), setupLine];
}

const CALENDAR_NOTE = "The attached invite adds it to your calendar.";

export function emailSessionBooked(input: SessionEmail) {
  return sendEmail({
    to: input.to,
    subject: `${subjectName(input)} booked: ${formatDateTime(input.startsAt)}`,
    heading: input.guest ? `Hi ${firstName(input.name)}, you're booked in` : `Hi ${firstName(input.name)}, our next session is booked`,
    paragraphs: [sessionLine(input), ...meetingLine(input)],
    button: viewButton(input),
    footnote: input.attachments?.length ? CALENDAR_NOTE : undefined,
    attachments: input.attachments,
  });
}

export function emailSessionRescheduled(input: SessionEmail) {
  return sendEmail({
    to: input.to,
    subject: `${subjectName(input)} moved to ${formatDateTime(input.startsAt)}`,
    heading: `Hi ${firstName(input.name)}, our session has moved`,
    paragraphs: [`The new time is: ${sessionLine(input)}`, ...meetingLine(input)],
    button: viewButton(input),
    footnote: input.attachments?.length ? "The attached invite updates the event in your calendar." : undefined,
    attachments: input.attachments,
  });
}

export function emailSessionCancelled(input: SessionEmail & { byClient: boolean }) {
  return sendEmail({
    to: input.to,
    subject: `${subjectName(input)} cancelled: ${formatDateTime(input.startsAt)}`,
    heading: `Hi ${firstName(input.name)}, our session is cancelled`,
    paragraphs: [
      `This session has been cancelled: ${sessionLine(input)}`,
      input.guest
        ? "If you'd like to find another time, just reply to this email."
        : input.byClient
          ? "The session has gone back into your package, so you can book another time whenever suits you."
          : "If it came from your package, the session has been returned so you can book another time.",
    ],
    button: input.guest ? undefined : { label: "Book another time", url: input.url },
    attachments: input.attachments,
  });
}

export function emailSessionReminder(input: SessionEmail & { when: "tomorrow" | "soon" }) {
  return sendEmail({
    to: input.to,
    subject: input.when === "soon" ? `Starting soon: ${input.title}` : `Reminder: ${input.title} tomorrow`,
    heading: input.when === "soon" ? `Hi ${firstName(input.name)}, we start in about an hour` : `Hi ${firstName(input.name)}, see you tomorrow`,
    paragraphs: [
      sessionLine(input),
      ...(input.phone ? [`Monika will ring you on ${input.phone}.`] : []),
      ...(!input.phone && joinNote(input.meetingUrl, "client") ? [joinNote(input.meetingUrl, "client")!] : []),
      ...(!input.phone && input.meetingUrl && input.when === "tomorrow" ? [setupLine] : []),
    ],
    button:
      input.meetingUrl && !input.phone
        ? { label: "Join the session", url: sessionJoinUrl(input)! }
        : { label: input.guest ? "View your booking" : "View in your client area", url: input.url },
    footnote: input.guest
      ? `Need to change it? Use your booking page: ${input.url}`
      : "Need to change it? You can reschedule from your client area.",
  });
}

export function emailAdminBooking(input: {
  to: string[];
  subject: string;
  lines: string[];
  url: string;
  buttonLabel?: string;
  attachments?: EmailAttachment[];
}) {
  return sendEmail({
    to: input.to,
    subject: input.subject,
    heading: input.subject,
    paragraphs: input.lines,
    button: { label: input.buttonLabel ?? "Open client", url: input.url },
    attachments: input.attachments,
  });
}

/** After an appointment: thanks, Monika's recap and the next step. */
export function emailSessionFollowUp(input: {
  to: string;
  name: string;
  title: string;
  recap: string[];
  nextText: string;
  button?: { label: string; url: string };
}) {
  return sendEmail({
    to: input.to,
    subject: `Thanks for today — ${input.title}`,
    heading: `Thank you, ${firstName(input.name)}`,
    paragraphs: [
      `Thank you for our ${input.title.toLowerCase()} today.`,
      ...(input.recap.length ? ["Here's a quick recap:", ...input.recap] : []),
      input.nextText,
    ],
    button: input.button,
    footnote: "Any questions in the meantime? Just reply to this email.",
  });
}

export function emailGuestWaiting(input: { to: string[]; guestName: string; title: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `${input.guestName} is waiting in your call`,
    heading: `${input.guestName} is waiting for you`,
    paragraphs: [`They've joined the ${input.title.toLowerCase()} and are waiting in the room.`],
    button: { label: "Join now", url: input.url },
  });
}

export function emailCallNow(input: { to: string; name: string; joinUrl: string; fromName: string }) {
  return sendEmail({
    to: input.to,
    subject: `${firstName(input.fromName)} is ready to talk now`,
    heading: `Hi ${firstName(input.name)}, I'm ready to talk now`,
    paragraphs: [
      "I've started a video call for us. Join whenever you're ready — it opens in your browser, no app or account needed.",
      "If now isn't a good time, just reply and we'll find another.",
    ],
    button: { label: "Join the call", url: input.joinUrl },
    footnote: setupLine,
  });
}

export function emailNewEnquiry(input: {
  to: string[];
  name: string;
  email: string;
  subtitle: string;
  rows: { label: string; value: string }[];
  url: string;
}) {
  return sendEmail({
    to: input.to,
    subject: `New enquiry: ${input.name}`,
    heading: `New enquiry from ${input.name}`,
    paragraphs: [`${input.email}${input.subtitle ? ` · ${input.subtitle}` : ""}`, ...input.rows.map((r) => `${r.label}: ${r.value}`)],
    button: { label: "Open the request", url: input.url },
    footnote: `Replying to this email goes straight to ${input.name}. Schedule a call or send a booking link from the request.`,
    replyTo: input.email,
  });
}

export function emailBookingLink(input: { to: string; name: string; typeName: string; durationMinutes: number; url: string; expiresAt: Date }) {
  return sendEmail({
    to: input.to,
    subject: `Book your ${input.typeName.toLowerCase()} with Monika`,
    heading: `Hi ${firstName(input.name)}, let's book our ${input.typeName.toLowerCase()}`,
    paragraphs: [
      `Thank you for your enquiry — I'd love to talk it through with you. Choose a time that suits you for a ${input.durationMinutes}-minute ${input.typeName.toLowerCase()}, by video or phone, whichever you prefer. You'll get a confirmation as soon as you've booked.`,
      "All times are shown in UK time.",
    ],
    button: { label: "Choose a time", url: input.url },
    footnote: `This link is just for you, works once and expires on ${formatDateTime(input.expiresAt)}. If none of the times suit, reply and we'll sort something out.`,
  });
}

// — Workshop payments —

type WorkshopInfo = {
  workshopName: string;
  startsAt: Date | null;
  location: string | null;
  /** The online joining link, when the workshop is online and has one. */
  meetingUrl?: string | null;
  /** Calendar invite for the workshop. */
  attachments?: EmailAttachment[];
  /** The attendee's own join link; worked out from `meetingUrl` if missing. */
  joinUrl?: string | null;
};

const workshopJoinFor = (w: WorkshopInfo, name: string) => w.joinUrl ?? personalJoinUrl(w.meetingUrl, { name, subject: w.workshopName });

function workshopLine(w: WorkshopInfo) {
  const when = w.startsAt ? `${formatDateTime(w.startsAt)} (UK time)` : "Date to be confirmed — I'll email you as soon as it's set";
  return `${w.workshopName}: ${when}${w.location ? `, ${w.location}` : ""}.`;
}

function workshopJoinLines(w: WorkshopInfo, name: string) {
  if (!w.meetingUrl) return [];
  const note = joinNote(w.meetingUrl, "client");
  return [`Join online here: ${workshopJoinFor(w, name)}`, ...(note ? [note] : []), setupLine];
}

export function emailDepositConfirmed(
  input: WorkshopInfo & { to: string; name: string; balancePence: number; account?: { url: string; isNew: boolean } },
) {
  return sendEmail({
    to: input.to,
    subject: `Your place is secured: ${input.workshopName}`,
    heading: `Thanks ${firstName(input.name)}, your place is secured`,
    paragraphs: [
      "I've received your deposit and your place on the workshop is reserved.",
      workshopLine(input),
      ...workshopJoinLines(input, input.name),
      `The remaining ${formatPence(input.balancePence)} is due a week before the workshop. I'll email you a secure payment link then — there's nothing to do until it arrives.`,
      ...(input.account
        ? [
            input.account.isNew
              ? "I've also set up your own Coach Skill client area, where you'll find your workshop details, any materials I share and a place to message me. Create your password to get started:"
              : "You'll find your workshop details in your Coach Skill client area:",
          ]
        : []),
    ],
    button: input.account
      ? { label: input.account.isNew ? "Set up your account" : "Open your client area", url: input.account.url }
      : undefined,
    footnote: [
      input.account?.isNew ? "The set-up link works once and expires in 7 days." : "",
      input.attachments?.length ? "The attached invite adds the workshop to your calendar." : "",
      "Your payment receipt comes separately from Stripe.",
    ]
      .filter(Boolean)
      .join(" "),
    attachments: input.attachments,
  });
}

export function emailAttendeeInvite(input: WorkshopInfo & { to: string; name: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Your Coach Skill client area is ready",
    heading: `Hi ${firstName(input.name)}, your client area is ready`,
    paragraphs: [
      "I've set up your own Coach Skill client area for the workshop — you'll find your booking, any materials I share and a place to message me.",
      workshopLine(input),
      "Create your password to get started:",
    ],
    button: { label: "Set up your account", url: input.url },
    footnote: "This link works once and expires in 7 days. If it has expired, just reply and I'll send you a new one.",
  });
}

export function emailBalanceRequest(input: WorkshopInfo & { to: string; name: string; balancePence: number; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `Balance due: ${input.workshopName}`,
    heading: `Hi ${firstName(input.name)}, the workshop is a week away`,
    paragraphs: [workshopLine(input), `Please pay the remaining ${formatPence(input.balancePence)} to confirm your place.`],
    button: { label: `Pay ${formatPence(input.balancePence)}`, url: input.url },
    footnote: "Payment is handled securely by Stripe. If you've already paid, please ignore this email.",
  });
}

export function emailBalanceReminder(input: WorkshopInfo & { to: string; name: string; balancePence: number; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `Reminder: balance due for ${input.workshopName}`,
    heading: `Hi ${firstName(input.name)}, a quick reminder`,
    paragraphs: [
      workshopLine(input),
      `The remaining ${formatPence(input.balancePence)} is still outstanding. Please pay before the workshop to keep your place.`,
    ],
    button: { label: `Pay ${formatPence(input.balancePence)}`, url: input.url },
    footnote: "If something's come up, just reply to this email.",
  });
}

export function emailBalancePaid(input: WorkshopInfo & { to: string; name: string }) {
  return sendEmail({
    to: input.to,
    subject: `You're all set: ${input.workshopName}`,
    heading: `You're all set, ${firstName(input.name)}`,
    paragraphs: ["Thanks — your workshop is fully paid.", workshopLine(input), ...workshopJoinLines(input, input.name), "I'm looking forward to seeing you there."],
    footnote: input.attachments?.length ? "The attached invite adds the workshop to your calendar." : undefined,
    attachments: input.attachments,
  });
}

/** The date, time or joining details of a booked workshop changed. */
export function emailWorkshopUpdated(input: WorkshopInfo & { to: string; name: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `Updated details: ${input.workshopName}`,
    heading: `Hi ${firstName(input.name)}, the workshop details have changed`,
    paragraphs: ["Here are the latest details for your workshop:", workshopLine(input), ...workshopJoinLines(input, input.name)],
    button: { label: "View in your client area", url: input.url },
    footnote: input.attachments?.length
      ? "The attached invite updates the event in your calendar. If the new time doesn't work for you, just reply to this email."
      : "If the new time doesn't work for you, just reply to this email.",
    attachments: input.attachments,
  });
}

export function emailWorkshopReminder(input: WorkshopInfo & { to: string; name: string; url: string; when: "tomorrow" | "soon" }) {
  return sendEmail({
    to: input.to,
    subject: input.when === "soon" ? `Starting soon: ${input.workshopName}` : `Reminder: ${input.workshopName} tomorrow`,
    heading:
      input.when === "soon" ? `Hi ${firstName(input.name)}, we start in about an hour` : `Hi ${firstName(input.name)}, see you tomorrow`,
    paragraphs: [
      workshopLine(input),
      ...(input.meetingUrl && joinNote(input.meetingUrl, "client") ? [joinNote(input.meetingUrl, "client")!] : []),
      ...(input.meetingUrl && input.when === "tomorrow" ? [setupLine] : []),
    ],
    button: input.meetingUrl
      ? { label: "Join the workshop", url: workshopJoinFor(input, input.name)! }
      : { label: "View in your client area", url: input.url },
    footnote: "If something's come up, just reply to this email.",
  });
}

export function emailAdminPayment(input: { to: string[]; subject: string; lines: string[]; url: string }) {
  return sendEmail({
    to: input.to,
    subject: input.subject,
    heading: input.subject,
    paragraphs: input.lines,
    button: { label: "Open in admin", url: input.url },
  });
}

export function emailPackagePurchased(input: { to: string; name: string; packageName: string; sessionCount: number; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `Thank you: ${input.packageName}`,
    heading: `Thanks ${firstName(input.name)}, you're all set`,
    paragraphs: [
      `Your ${input.packageName} is confirmed — that's ${input.sessionCount} coaching ${input.sessionCount === 1 ? "session" : "sessions"} together.`,
      "You can see your sessions and what's left in your package in your client area. I'll be in touch to arrange our first session.",
    ],
    button: { label: "Open your client area", url: input.url },
    footnote: "Your payment receipt comes separately from Stripe.",
  });
}

export function emailNewResource(input: { to: string; name: string; title: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `New resource from Monika: ${input.title}`,
    heading: `Hi ${firstName(input.name)}, I've shared something with you`,
    paragraphs: [`"${input.title}" is now in the Resources section of your client area.`],
    button: { label: "Open resources", url: input.url },
  });
}
