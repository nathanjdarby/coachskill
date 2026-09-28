// Enquiry form questions (the "discovery call" request). Shared by the flow UI, the API
// route that validates submissions, and the admin view — edit questions here only.

import { normalisePhone } from "@/lib/phone";

export type Answers = Record<string, string>;

export type Option = { value: string; label: string; hint?: string };

type Base = {
  id: QuestionId;
  section: SectionId;
  title: string | ((ctx: FlowContext) => string);
  /** Hint under the question; may depend on earlier answers. */
  help?: string | ((answers: Answers) => string);
  optional?: boolean;
  /** Short label used on the review screen and admin view. */
  label: string;
  /** Not asked (and not required) when this returns true, e.g. team size for "Myself". */
  skipIf?: (answers: Answers) => boolean;
  /** Makes an optional question required for some answers (phone number for phone calls). */
  requiredIf?: (answers: Answers) => boolean;
};

export type Question =
  | (Base & { type: "single"; options: Option[] })
  /** Several options; the answer is the chosen values joined with "|". */
  | (Base & { type: "multi"; options: Option[]; exclusive?: string })
  | (Base & {
      type: "text";
      placeholder?: string;
      maxLength: number;
      inputType?: "text" | "email" | "tel";
      autoComplete?: string;
    })
  | (Base & { type: "textarea"; placeholder?: string; maxLength: number });

export type FlowContext = { firstName: string };

export const sections = [
  { id: "about", title: "About you" },
  { id: "needs", title: "What you need" },
  { id: "plans", title: "Next steps" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export type QuestionId =
  | "fullName"
  | "email"
  | "callPreference"
  | "phone"
  | "company"
  | "interests"
  | "audience"
  | "teamSize"
  | "support"
  | "startTimeline"
  | "anythingElse";

export const callPreferenceOptions: Option[] = [
  { value: "video", label: "Video call", hint: "A private video room in your browser — no app needed" },
  { value: "phone", label: "Phone call", hint: "Monika rings you" },
  { value: "either", label: "Either is fine" },
];

export const interestOptions: Option[] = [
  { value: "sales_methodologies", label: "Sales Methodologies Training" },
  { value: "leadership", label: "Leadership Development" },
  { value: "emotional_intelligence", label: "Emotional Intelligence & 360° Feedback" },
  { value: "enablement", label: "Sales Enablement & Onboarding" },
  { value: "value_selling", label: "Value Selling" },
  { value: "presentation", label: "Presentation & Storytelling Skills" },
  { value: "objections", label: "Objection Handling & Negotiation" },
  { value: "sales_coaching", label: "Sales Coaching" },
  { value: "team_development", label: "Team Development" },
  { value: "bespoke", label: "Bespoke Training" },
  { value: "not_sure", label: "Not sure yet" },
];

export const audienceOptions: Option[] = [
  { value: "myself", label: "Myself" },
  { value: "team", label: "A team" },
  { value: "leaders", label: "Managers / Leaders" },
  { value: "sales", label: "Sales professionals" },
  { value: "organisation", label: "Wider organisation" },
];

export const teamSizeOptions: Option[] = [
  { value: "1", label: "1" },
  { value: "2-10", label: "2–10" },
  { value: "11-25", label: "11–25" },
  { value: "26-50", label: "26–50" },
  { value: "50+", label: "50+" },
  { value: "not_sure", label: "Not sure yet" },
];

export const startOptions: Option[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3_months", label: "Within 1–3 months" },
  { value: "3-6_months", label: "Within 3–6 months" },
  { value: "exploring", label: "Just exploring" },
];

/** Answers from the earlier version of the form, kept so old requests still read well. */
export const personaOptions: Option[] = [
  { value: "professional", label: "A professional seeking mentoring" },
  { value: "business_owner", label: "Self-employed or a business owner" },
  { value: "corporate", label: "A corporate employee" },
];

export const questions: Question[] = [
  // — About you —
  {
    id: "fullName",
    section: "about",
    type: "text",
    label: "Name",
    title: "First up — what's your name?",
    help: "Please enter your first and last name.",
    placeholder: "Jane Smith",
    maxLength: 120,
    autoComplete: "name",
  },
  {
    id: "email",
    section: "about",
    type: "text",
    inputType: "email",
    label: "Work email",
    title: ({ firstName }) => (firstName ? `Nice to meet you, ${firstName}. What's your work email?` : "What's your work email?"),
    help: "We'll reply to you here.",
    placeholder: "jane@company.com",
    maxLength: 254,
    autoComplete: "email",
  },
  {
    id: "callPreference",
    section: "about",
    type: "single",
    label: "Prefers to talk by",
    title: "How would you prefer to talk?",
    help: "For your discovery call with Monika.",
    options: callPreferenceOptions,
  },
  {
    id: "phone",
    section: "about",
    type: "text",
    inputType: "tel",
    label: "Phone",
    title: ({ firstName }) => (firstName ? `What number should Monika call, ${firstName}?` : "What number should Monika call?"),
    help: (a) =>
      a.callPreference === "phone"
        ? "Monika will ring you on this number."
        : "Optional — handy if a phone call ends up easier. You can still choose when you book.",
    placeholder: "07700 900123",
    maxLength: 30,
    autoComplete: "tel",
    optional: true,
    skipIf: (a) => a.callPreference === "video",
    requiredIf: (a) => a.callPreference === "phone",
  },
  {
    id: "company",
    section: "about",
    type: "text",
    label: "Company / Organisation",
    title: "Which company or organisation are you with?",
    help: "If it's just you, your business name or \"Self-employed\" is fine.",
    placeholder: "e.g. Harbour Street Consulting",
    maxLength: 120,
    autoComplete: "organization",
  },

  // — What you need —
  {
    id: "interests",
    section: "needs",
    type: "multi",
    label: "Interested in",
    title: "What are you interested in?",
    help: "Select any that apply.",
    options: interestOptions,
    exclusive: "not_sure",
  },
  {
    id: "audience",
    section: "needs",
    type: "single",
    label: "Who it's for",
    title: "Who is this for?",
    options: audienceOptions,
  },
  {
    id: "teamSize",
    section: "needs",
    type: "single",
    label: "How many people",
    title: "Approximately how many people?",
    options: teamSizeOptions,
    skipIf: (a) => a.audience === "myself",
  },

  // — Next steps —
  {
    id: "support",
    section: "plans",
    type: "text",
    label: "Support with",
    title: "What would you like support with?",
    help: "A sentence or two is plenty.",
    placeholder: "e.g. Helping new sales hires get up to speed faster",
    maxLength: 300,
  },
  {
    id: "startTimeline",
    section: "plans",
    type: "single",
    label: "Looking to start",
    title: "When are you looking to start?",
    options: startOptions,
  },
  {
    id: "anythingElse",
    section: "plans",
    type: "textarea",
    label: "Anything else",
    title: "Anything else you'd like us to know?",
    help: "Optional.",
    maxLength: 2000,
    optional: true,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function questionHelp(q: Question, answers: Answers) {
  return typeof q.help === "function" ? q.help(answers) : q.help;
}

export function questionTitle(q: Question, ctx: FlowContext) {
  return typeof q.title === "function" ? q.title(ctx) : q.title;
}

export function firstNameOf(answers: Answers) {
  return (answers.fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

export function isAnswered(q: Question, answers: Answers) {
  return (answers[q.id] ?? "").trim().length > 0;
}

export function isSkipped(q: Question, answers: Answers) {
  return q.skipIf?.(answers) ?? false;
}

/** The questions this person is asked, given their answers so far. */
export function activeQuestions(answers: Answers) {
  return questions.filter((q) => !isSkipped(q, answers));
}

/** A multi-choice answer as a list of values. */
export function multiValues(value: string | null | undefined) {
  return (value ?? "").split("|").filter(Boolean);
}

/** Returns a message when a non-empty answer is invalid, otherwise null. */
export function validationError(q: Question, answers: Answers): string | null {
  const v = (answers[q.id] ?? "").trim();
  if (!v) return null;
  if (q.id === "email" && !EMAIL_RE.test(v)) {
    return "That doesn't look like an email address — please check it.";
  }
  if (q.id === "phone" && !normalisePhone(v)) {
    return "That doesn't look like a phone number — please check it, or skip this one.";
  }
  if (q.type === "single" && !q.options.some((o) => o.value === v)) {
    return "Please choose one of the options.";
  }
  if (q.type === "multi" && !multiValues(v).every((x) => q.options.some((o) => o.value === x))) {
    return "Please choose from the options.";
  }
  return null;
}

/** Whether a question must be answered, given the answers so far. */
export function isRequired(q: Question, answers: Answers) {
  return !q.optional || (q.requiredIf?.(answers) ?? false);
}

/** Required questions that are unanswered or invalid. */
export function missingOrInvalid(answers: Answers) {
  return activeQuestions(answers).filter((q) => (isRequired(q, answers) && !isAnswered(q, answers)) || validationError(q, answers));
}

/** Keeps only known question ids with string values, trimmed to each question's limit. */
export function sanitizeAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Answers = {};
  for (const q of questions) {
    const v = src[q.id];
    if (typeof v !== "string") continue;
    const max = q.type === "single" ? 64 : q.type === "multi" ? 400 : q.maxLength;
    const trimmed = v.trim().slice(0, max);
    if (trimmed) out[q.id] = trimmed;
  }
  return out;
}

function optionLabel(options: Option[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatAnswer(q: Question, answers: Answers) {
  const v = answers[q.id] ?? "";
  if (q.type === "single") return optionLabel(q.options, v);
  if (q.type === "multi") return multiValues(v).map((x) => optionLabel(q.options, x)).join(", ");
  return v;
}

export function personaLabel(value: string) {
  return optionLabel(personaOptions, value);
}

type StoredEnquiry = {
  company: string;
  callPreference?: string | null;
  interests: string | null;
  audience: string | null;
  teamSize: string | null;
  support: string | null;
  startTimeline: string | null;
  anythingElse: string | null;
  persona: string | null;
  goal: string | null;
  challenges: string | null;
};

/** One line under the name in lists: company and who it's for. */
export function enquirySubtitle(e: Pick<StoredEnquiry, "company" | "audience" | "teamSize" | "persona">) {
  const who = e.audience
    ? `For ${optionLabel(audienceOptions, e.audience).toLowerCase()}${e.teamSize && e.audience !== "myself" ? ` (${optionLabel(teamSizeOptions, e.teamSize)})` : ""}`
    : e.persona
      ? personaLabel(e.persona)
      : null;
  return [e.company, who].filter(Boolean).join(" · ");
}

/** The answers worth showing, labelled, for both the current and the earlier form. */
export function enquiryRows(e: StoredEnquiry): { label: string; value: string; list?: string[] }[] {
  const rows: { label: string; value: string; list?: string[] }[] = [];
  if (e.interests) {
    const list = multiValues(e.interests).map((x) => optionLabel(interestOptions, x));
    rows.push({ label: "Interested in", value: list.join(", "), list });
  }
  if (e.audience) rows.push({ label: "Who it's for", value: optionLabel(audienceOptions, e.audience) });
  if (e.teamSize && e.audience !== "myself") rows.push({ label: "How many people", value: optionLabel(teamSizeOptions, e.teamSize) });
  if (e.callPreference) rows.push({ label: "Prefers to talk by", value: optionLabel(callPreferenceOptions, e.callPreference) });
  if (e.support) rows.push({ label: "Support with", value: e.support });
  if (e.startTimeline) rows.push({ label: "Looking to start", value: optionLabel(startOptions, e.startTimeline) });
  if (e.persona) rows.push({ label: "Describes themselves as", value: personaLabel(e.persona) });
  if (e.goal) rows.push({ label: "Main goal (6 months)", value: e.goal });
  if (e.challenges) rows.push({ label: "Challenges", value: e.challenges });
  if (e.anythingElse) rows.push({ label: "Anything else", value: e.anythingElse });
  return rows;
}
