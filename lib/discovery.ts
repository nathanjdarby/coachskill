// Discovery call questions. Shared by the flow UI, the API route that
// validates submissions, and the admin view — edit questions here only.

export type Answers = Record<string, string>;

export type Option = { value: string; label: string; hint?: string };

type Base = {
  id: QuestionId;
  section: SectionId;
  title: string | ((ctx: FlowContext) => string);
  help?: string;
  optional?: boolean;
  /** Short label used on the review screen and admin view. */
  label: string;
};

export type Question =
  | (Base & { type: "single"; options: Option[] })
  | (Base & {
      type: "text";
      placeholder?: string;
      maxLength: number;
      inputType?: "text" | "email";
      autoComplete?: string;
    })
  | (Base & { type: "textarea"; placeholder?: string; maxLength: number });

export type FlowContext = { firstName: string };

export const sections = [
  { id: "about", title: "About you" },
  { id: "situation", title: "Your situation" },
  { id: "goals", title: "Your goals" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export type QuestionId =
  | "fullName"
  | "email"
  | "company"
  | "persona"
  | "goal"
  | "challenges"
  | "anythingElse";

export const personaOptions: Option[] = [
  {
    value: "professional",
    label: "A professional seeking mentoring",
    hint: "Or looking for personal development",
  },
  {
    value: "business_owner",
    label: "Self-employed or a business owner",
    hint: "Service provider, solo business owner, or small business owner with a team",
  },
  { value: "corporate", label: "A corporate employee" },
];

export const questions: Question[] = [
  // — About you —
  {
    id: "fullName",
    section: "about",
    type: "text",
    label: "Full name",
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
    label: "Email",
    title: ({ firstName }) =>
      firstName
        ? `Nice to meet you, ${firstName}. What's your email?`
        : "What's your email address?",
    help: "Your confirmation and meeting link will be sent here.",
    placeholder: "jane@company.com",
    maxLength: 254,
    autoComplete: "email",
  },
  {
    id: "company",
    section: "about",
    type: "text",
    label: "Company",
    title: "What's your company name?",
    help: "Where do you currently work, or which business do you run?",
    placeholder: "e.g. Harbour Street Consulting",
    maxLength: 120,
    autoComplete: "organization",
  },

  // — Your situation —
  {
    id: "persona",
    section: "situation",
    type: "single",
    label: "Describes themselves as",
    title: "How would you best describe yourself?",
    help: "Select the option that matches your current situation.",
    options: personaOptions,
  },

  // — Your goals —
  {
    id: "goal",
    section: "goals",
    type: "textarea",
    label: "Main goal (6 months)",
    title: "What is your main goal for the next 6 months?",
    help: "Describe the results you want to achieve — e.g. higher sales, confidence, better communication, presenting your product better, stronger leadership skills.",
    placeholder: "I want to…",
    maxLength: 2000,
  },
  {
    id: "challenges",
    section: "goals",
    type: "textarea",
    label: "Challenges",
    title: "What challenges or barriers are holding you back?",
    help: "Tell me what feels difficult right now so I can understand how to support you best.",
    placeholder: "Right now I find it hard to…",
    maxLength: 2000,
  },
  {
    id: "anythingElse",
    section: "goals",
    type: "textarea",
    label: "Anything else",
    title: "Anything else I should know before our call?",
    help: "Optional — share anything important about your work, goals, or situation.",
    maxLength: 2000,
    optional: true,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function questionTitle(q: Question, ctx: FlowContext) {
  return typeof q.title === "function" ? q.title(ctx) : q.title;
}

export function firstNameOf(answers: Answers) {
  return (answers.fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

export function isAnswered(q: Question, answers: Answers) {
  return (answers[q.id] ?? "").trim().length > 0;
}

/** Returns a message when a non-empty answer is invalid, otherwise null. */
export function validationError(q: Question, answers: Answers): string | null {
  const v = (answers[q.id] ?? "").trim();
  if (!v) return null;
  if (q.id === "email" && !EMAIL_RE.test(v)) {
    return "That doesn't look like an email address — please check it.";
  }
  if (q.type === "single" && !q.options.some((o) => o.value === v)) {
    return "Please choose one of the options.";
  }
  return null;
}

/** Required questions that are unanswered or invalid. */
export function missingOrInvalid(answers: Answers) {
  return questions.filter(
    (q) => (!q.optional && !isAnswered(q, answers)) || validationError(q, answers),
  );
}

/** Keeps only known question ids with string values, trimmed to each question's limit. */
export function sanitizeAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Answers = {};
  for (const q of questions) {
    const v = src[q.id];
    if (typeof v !== "string") continue;
    const max = q.type === "single" ? 64 : q.maxLength;
    const trimmed = v.trim().slice(0, max);
    if (trimmed) out[q.id] = trimmed;
  }
  return out;
}

export function formatAnswer(q: Question, answers: Answers) {
  const v = answers[q.id] ?? "";
  if (q.type === "single") return q.options.find((o) => o.value === v)?.label ?? v;
  return v;
}

export function personaLabel(value: string) {
  return personaOptions.find((o) => o.value === value)?.label ?? value;
}
