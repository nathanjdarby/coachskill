"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  activeQuestions,
  firstNameOf,
  formatAnswer,
  isAnswered,
  multiValues,
  questionTitle,
  questions,
  sanitizeAnswers,
  sections,
  validationError,
  type Answers,
  type Question,
} from "@/lib/discovery";

type SaveState = "idle" | "saved" | "error";
type Saved = { answers: Answers; step: string };

const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STORAGE_KEY = "coachskill.enquiry.v2";
const ALL_STEPS = ["intro", ...questions.map((q) => q.id), "review"];

/** The screens for these answers (questions like team size drop out for "Myself"). */
function stepsFor(answers: Answers) {
  return ["intro", ...activeQuestions(answers).map((q) => q.id), "review"];
}

// Progress lives in this browser only — visitors aren't signed in.
function readSavedRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { answers?: unknown; step?: unknown };
    const answers = sanitizeAnswers(parsed.answers);
    const step =
      typeof parsed.step === "string" && ALL_STEPS.includes(parsed.step)
        ? parsed.step
        : "intro";
    if (Object.keys(answers).length === 0) return null;
    return { answers, step: step === "intro" ? ALL_STEPS[1] : step };
  } catch {
    return null;
  }
}

function writeSaved(saved: Saved | null): boolean {
  try {
    if (saved) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

type FormToken = { token: string; receivedAt: number };

// The server rejects submissions sent within a few seconds of the token being
// issued (a bot tell), so wait out that window before sending.
const TOKEN_MIN_WAIT_MS = 5_000;

async function requestToken(): Promise<FormToken | null> {
  try {
    const res = await fetch("/api/discovery-call", { cache: "no-store" });
    const data = (await res.json()) as { token?: unknown };
    return typeof data.token === "string"
      ? { token: data.token, receivedAt: Date.now() }
      : null;
  } catch {
    return null;
  }
}

export function DiscoveryFlow() {
  const savedRaw = useSyncExternalStore(subscribeStorage, readSavedRaw, () => null);
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);

  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<string>("intro");
  const [started, setStarted] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [returnToReview, setReturnToReview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<FormToken | null>(null);

  useEffect(() => {
    let cancelled = false;
    void requestToken().then((t) => {
      if (!cancelled && t) tokenRef.current = t;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = stepsFor(answers);
  const index = Math.max(0, steps.indexOf(step));
  const question = questions.find((q) => q.id === step) ?? null;
  const firstName = firstNameOf(answers);
  const resuming = !started && saved !== null;

  const goTo = useCallback(
    (target: string, dir: 1 | -1, latestAnswers: Answers = answers) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setDirection(dir);
      setStep(target);
      setFieldError(null);
      if (target !== "done" && target !== "intro") {
        setSaveState(writeSaved({ answers: latestAnswers, step: target }) ? "saved" : "error");
      }
      window.scrollTo({ top: 0 });
    },
    [answers],
  );

  const next = useCallback(
    (latestAnswers: Answers = answers) => {
      if (question) {
        const err = validationError(question, latestAnswers);
        if (err) {
          setFieldError(err);
          return;
        }
      }
      if (returnToReview && step !== "intro") {
        setReturnToReview(false);
        goTo("review", 1, latestAnswers);
        return;
      }
      // Work out the next screen from the latest answers, which may skip a question.
      const latestSteps = stepsFor(latestAnswers);
      const at = latestSteps.indexOf(step);
      goTo(latestSteps[Math.min(at + 1, latestSteps.length - 1)], 1, latestAnswers);
    },
    [answers, question, returnToReview, step, goTo],
  );

  const back = useCallback(() => {
    if (index > 0) goTo(steps[index - 1], -1);
  }, [index, steps, goTo]);

  const update = useCallback((patch: Answers) => {
    setFieldError(null);
    setAnswers((prev) => {
      const merged = { ...prev, ...patch };
      for (const [k, v] of Object.entries(patch)) {
        if (v === "") delete merged[k];
      }
      return merged;
    });
  }, []);

  function start() {
    setStarted(true);
    if (saved) {
      setAnswers(saved.answers);
      goTo(saved.step, 1, saved.answers);
    } else {
      next();
    }
  }

  function startOver() {
    writeSaved(null);
    setStarted(true);
    setAnswers({});
    goTo(ALL_STEPS[1], 1, {});
  }

  const canContinue = !question || question.optional || isAnswered(question, answers);

  async function readyToken(): Promise<string | null> {
    const t = tokenRef.current ?? (tokenRef.current = await requestToken());
    if (!t) return null;
    const wait = TOKEN_MIN_WAIT_MS - (Date.now() - t.receivedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return t.token;
  }

  async function post(token: string | null) {
    const res = await fetch("/api/discovery-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, token, website: honeypot }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      missing?: string[];
    };
    return { res, data };
  }

  async function submit() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      let { res, data } = await post(await readyToken());
      if (data.code === "token") {
        // Token expired (e.g. the tab was left open) — get a fresh one and retry once.
        tokenRef.current = null;
        ({ res, data } = await post(await readyToken()));
      }
      if (res.ok) {
        writeSaved(null);
        setSubmittedEmail(answers.email ?? "");
        goTo("done", 1);
        return;
      }
      setSubmitError(data.error || "Something went wrong. Please try again.");
      if (data.missing?.length) {
        setReturnToReview(true);
        goTo(data.missing[0], -1);
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function scheduleAdvance(latest: Answers) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => next(latest), 380);
  }

  // Keyboard: Enter continues, letters pick options.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || step === "done") return;
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        if (target.tagName === "TEXTAREA" && !(e.metaKey || e.ctrlKey)) return;
        if (target.tagName === "BUTTON" || target.tagName === "A") return;
        e.preventDefault();
        if (step === "intro") start();
        else if (step === "review") void submit();
        else if (canContinue) next();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || (question?.type !== "single" && question?.type !== "multi")) return;
      if (/^[a-z]$/i.test(e.key)) {
        const value = question.options[KEYS.indexOf(e.key.toUpperCase())]?.value;
        if (!value) return;
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>(`[data-option="${CSS.escape(value)}"]`)
          ?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const sectionIndex = question
    ? sections.findIndex((s) => s.id === question.section)
    : -1;

  return (
    <div className="onb">
      <header className="onb-header">
        <div className="onb-header-row">
          <Link href="/" className="header-brand">
            <Image
              src="/assets/coach-skill-logo.png"
              alt=""
              className="logo"
              width={120}
              height={40}
            />
            <span className="header-wordmark">Coach Skill</span>
          </Link>
          {step !== "done" && step !== "intro" && (
            <div className="onb-header-meta">
              <span aria-live="polite" className="onb-save-state">
                {saveState === "saved"
                  ? "✓ Saved"
                  : saveState === "error"
                    ? "Couldn't save"
                    : ""}
              </span>
              <Link
                href="/"
                onClick={() => writeSaved({ answers, step })}
                className="onb-finish-later"
              >
                Finish later
              </Link>
            </div>
          )}
        </div>
        {step !== "intro" && (
          <div className="onb-progress">
            {sections.map((s, i) => {
              const qs = activeQuestions(answers).filter((q) => q.section === s.id);
              const done =
                step === "review" || step === "done"
                  ? qs.length
                  : qs.filter((q) => steps.indexOf(q.id) < index).length;
              const pct = (done / qs.length) * 100;
              return (
                <div key={s.id}>
                  <div className="onb-progress-track">
                    <div className="onb-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p
                    className={`onb-progress-label ${i === sectionIndex ? "is-current" : ""}`}
                  >
                    {s.title}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </header>

      <main className={`onb-main${step === "intro" ? " onb-main-intro" : ""}`}>
        <div
          key={step}
          className={`onb-stage ${direction === 1 ? "onb-step-in" : "onb-step-back"}`}
        >
          {step === "intro" && (
            <Intro
              firstName={saved ? firstNameOf(saved.answers) : ""}
              resuming={resuming}
              onStart={start}
              onStartOver={startOver}
            />
          )}

          {question && (
            <QuestionScreen
              question={question}
              title={questionTitle(question, { firstName })}
              sectionNumber={sectionIndex + 1}
              answers={answers}
              update={update}
              onAutoAdvance={scheduleAdvance}
              canContinue={canContinue}
              error={fieldError}
              onNext={() => next()}
              onBack={back}
              returnToReview={returnToReview}
            />
          )}

          {step === "review" && (
            <Review
              answers={answers}
              honeypot={honeypot}
              onHoneypot={setHoneypot}
              error={submitError}
              submitting={submitting}
              onEdit={(id) => {
                setReturnToReview(true);
                goTo(id, -1);
              }}
              onBack={back}
              onSubmit={() => void submit()}
            />
          )}

          {step === "done" && <Done firstName={firstName} email={submittedEmail} />}
        </div>
      </main>
    </div>
  );
}

function Intro({
  firstName,
  resuming,
  onStart,
  onStartOver,
}: {
  firstName: string;
  resuming: boolean;
  onStart: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="onb-center onb-intro">
      <Image
        src="/assets/coach-portrait.png"
        alt="Monika Kozlowska"
        className="onb-avatar"
        width={112}
        height={112}
        priority
      />
      <p className="eyebrow onb-intro-eyebrow">
        {resuming ? "Welcome back" : "Get in touch"}
      </p>
      <h1 className="onb-intro-title">
        {resuming ? (
          <>
            Let&apos;s pick up where you left off
            {firstName ? (
              <>
                , <span>{firstName}.</span>
              </>
            ) : (
              "."
            )}
          </>
        ) : (
          <>
            Tell us what you&apos;re <span>looking for.</span>
          </>
        )}
      </h1>
      <p className="onb-intro-lead">
        A few quick questions about you, your team and what you need, so we can
        come back to you with the right support.
      </p>

      <ul className="onb-chips">
        {["About 2 minutes", "Saves as you go", "Review before sending"].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <button type="button" onClick={onStart} autoFocus className="cta cta-hero onb-start">
        {resuming ? "Continue" : "Let's begin"} <span aria-hidden>→</span>
      </button>
      {resuming ? (
        <p className="onb-hint">
          <button type="button" onClick={onStartOver} className="onb-link-btn">
            Start over instead
          </button>
        </p>
      ) : (
        <p className="onb-hint onb-desktop-only">
          or press <Kbd>Enter ↵</Kbd>
        </p>
      )}
      <p className="onb-signoff">— Monika Kozlowska, Coach Skill</p>
    </div>
  );
}

function QuestionScreen({
  question: q,
  title,
  sectionNumber,
  answers,
  update,
  onAutoAdvance,
  canContinue,
  error,
  onNext,
  onBack,
  returnToReview,
}: {
  question: Question;
  title: string;
  sectionNumber: number;
  answers: Answers;
  update: (patch: Answers) => void;
  onAutoAdvance: (latest: Answers) => void;
  canContinue: boolean;
  error: string | null;
  onNext: () => void;
  onBack: () => void;
  returnToReview: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = `q-${q.id}-title`;
  const helpId = `q-${q.id}-help`;
  const errorId = `q-${q.id}-error`;
  const section = sections[sectionNumber - 1];
  const value = answers[q.id] ?? "";

  useEffect(() => {
    // Text questions focus their field; choice questions focus the heading for screen readers.
    if (q.type === "single" || q.type === "multi") headingRef.current?.focus({ preventScroll: true });
  }, [q.id, q.type]);

  return (
    <div>
      <p className="onb-kicker">
        <span>{String(sectionNumber).padStart(2, "0")}</span> · {section?.title}
      </p>
      <h1 ref={headingRef} id={titleId} tabIndex={-1} className="onb-question-title">
        {title}
      </h1>
      {q.help && (
        <p id={helpId} className="onb-help">
          {q.help}
        </p>
      )}

      <div className="onb-answer">
        {q.type === "text" && (
          <input
            autoFocus
            type={q.inputType ?? "text"}
            aria-labelledby={titleId}
            aria-describedby={error ? errorId : q.help ? helpId : undefined}
            aria-invalid={error ? true : undefined}
            value={value}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            autoComplete={q.autoComplete ?? "off"}
            onChange={(e) => update({ [q.id]: e.target.value })}
            className="onb-input"
          />
        )}
        {q.type === "textarea" && (
          <div>
            <textarea
              autoFocus
              aria-labelledby={titleId}
              aria-describedby={q.help ? helpId : undefined}
              value={value}
              maxLength={q.maxLength}
              rows={5}
              placeholder={q.placeholder}
              onChange={(e) => update({ [q.id]: e.target.value })}
              className="onb-input onb-textarea"
            />
            <p className="onb-counter">
              {value.length}/{q.maxLength}
            </p>
          </div>
        )}
        {q.type === "single" && (
          <div role="radiogroup" aria-labelledby={titleId} className="onb-options">
            {q.options.map((o, i) => {
              const on = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  data-option={o.value}
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    const patch = { [q.id]: o.value };
                    update(patch);
                    onAutoAdvance({ ...answers, ...patch });
                  }}
                  className={`onb-option ${on ? "is-selected" : ""}`}
                >
                  <span aria-hidden className="onb-option-key">
                    {on ? "✓" : KEYS[i]}
                  </span>
                  <span className="onb-option-text">
                    <span className="onb-option-label">{o.label}</span>
                    {o.hint && <span className="onb-option-hint">{o.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {q.type === "multi" && (
          <div role="group" aria-labelledby={titleId} className="onb-options onb-options-multi">
            {q.options.map((o, i) => {
              const chosen = multiValues(value);
              const on = chosen.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  data-option={o.value}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => {
                    // "Not sure yet" stands alone; picking anything else clears it.
                    const nextValues = on
                      ? chosen.filter((v) => v !== o.value)
                      : o.value === q.exclusive
                        ? [o.value]
                        : [...chosen.filter((v) => v !== q.exclusive), o.value];
                    // Keep the options' order so answers read consistently.
                    const ordered = q.options.map((opt) => opt.value).filter((v) => nextValues.includes(v));
                    update({ [q.id]: ordered.join("|") });
                  }}
                  className={`onb-option ${on ? "is-selected" : ""}`}
                >
                  <span aria-hidden className="onb-option-key">
                    {on ? "✓" : KEYS[i]}
                  </span>
                  <span className="onb-option-text">
                    <span className="onb-option-label">{o.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="onb-error">
            {error}
          </p>
        )}
      </div>

      <div className="onb-nav">
        <button type="button" onClick={onBack} className="onb-back">
          <span aria-hidden>←</span> Back
        </button>
        {q.optional && !isAnswered(q, answers) ? (
          <button type="button" onClick={onNext} className="onb-secondary">
            Skip
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className="cta onb-continue"
          >
            {returnToReview ? "Back to review" : "Continue"} <span aria-hidden>→</span>
          </button>
        )}
      </div>
      <p className="onb-hint onb-hint-right onb-desktop-only">
        {q.type === "textarea" ? (
          <>
            <Kbd>⌘ Enter</Kbd> to continue
          </>
        ) : q.type === "single" ? (
          <>
            Press a letter to choose · <Kbd>Enter ↵</Kbd> to continue
          </>
        ) : q.type === "multi" ? (
          <>
            Press letters to pick as many as you like · <Kbd>Enter ↵</Kbd> to continue
          </>
        ) : (
          <>
            <Kbd>Enter ↵</Kbd> to continue
          </>
        )}
      </p>
    </div>
  );
}

function Review({
  answers,
  honeypot,
  onHoneypot,
  error,
  submitting,
  onEdit,
  onBack,
  onSubmit,
}: {
  answers: Answers;
  honeypot: string;
  onHoneypot: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onEdit: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <p className="eyebrow">Last step</p>
      <h1 className="onb-question-title">Does this look right?</h1>
      <p className="onb-help">
        Tap any answer to change it. Your enquiry comes straight to Monika.
      </p>

      <div className="onb-review">
        {sections.map((s) => (
          <section key={s.id} className="onb-review-card">
            <h2>{s.title}</h2>
            <dl>
              {activeQuestions(answers)
                .filter((q) => q.section === s.id)
                .map((q) => {
                  const answered = isAnswered(q, answers);
                  const missing = !answered && !q.optional;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onEdit(q.id)}
                      className="onb-review-row"
                    >
                      <dt>{q.label}</dt>
                      <dd
                        className={
                          missing ? "is-missing" : answered ? "" : "is-skipped"
                        }
                      >
                        {answered
                          ? formatAnswer(q, answers)
                          : missing
                            ? "Needs an answer"
                            : "Skipped"}
                      </dd>
                      <span className="onb-review-edit">Edit</span>
                    </button>
                  );
                })}
            </dl>
          </section>
        ))}
      </div>

      {/* Honeypot: hidden from people, filled in by form-filling bots. */}
      <div className="onb-hp" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => onHoneypot(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="onb-error onb-error-box">
          {error}
        </p>
      )}

      <div className="onb-nav">
        <button type="button" onClick={onBack} className="onb-back">
          <span aria-hidden>←</span> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="cta onb-continue"
        >
          {submitting ? "Sending…" : "Send Enquiry"} <span aria-hidden>→</span>
        </button>
      </div>
      <p className="onb-submit-note">We&apos;ll review your enquiry and get back to you personally.</p>
    </div>
  );
}

function Done({ firstName, email }: { firstName: string; email: string }) {
  const nextSteps = [
    {
      title: "We review it",
      body: "Monika reads every enquiry herself, so the reply fits what you need.",
    },
    {
      title: "We get in touch",
      body: email
        ? `You'll hear back personally at ${email}.`
        : "You'll hear back personally by email.",
    },
    {
      title: "We talk",
      body: "A relaxed call to explore your goals and the best way to support you or your team.",
    },
  ];
  return (
    <div className="onb-center">
      <div className="onb-done-mark" aria-hidden>
        ✓
      </div>
      <h1 className="onb-intro-title">
        Thank you{firstName ? ", " : ""}
        {firstName && <span>{firstName}.</span>}
        {!firstName && "."}
      </h1>
      <p className="onb-intro-lead">
        Your enquiry is on its way. Here&apos;s what happens next.
      </p>

      <ol className="onb-next-steps">
        {nextSteps.map((s, i) => (
          <li key={s.title}>
            <span className="onb-next-num">{String(i + 1).padStart(2, "0")}</span>
            <p className="onb-next-title">{s.title}</p>
            <p className="onb-next-body">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="onb-done-actions">
        <Link href="/meet-monika" className="cta cta-hero">
          Meet Monika
        </Link>
        <Link href="/" className="onb-secondary">
          Back to the site
        </Link>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="onb-kbd">{children}</kbd>;
}
