"use client";

import { useActionState, useState } from "react";
import { deleteProgramme, saveProgramme } from "@/app/actions/workshops";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";
import { STARTER_HIGHLIGHTS, WORKSHOP_CATEGORIES, type WorkshopPoint } from "@/lib/workshop-categories";

export type ProgrammeFormValues = {
  category: string;
  title: string;
  slug: string;
  summary: string;
  intro: string;
  outcomes: WorkshopPoint[];
  highlights: WorkshopPoint[];
  imageUrl: string | null;
  durationMinutes: string;
  capacity: string;
  deposit: string;
  balance: string;
  showTeamSection: boolean;
  published: boolean;
};

export const NEW_PROGRAMME: ProgrammeFormValues = {
  category: "",
  title: "",
  slug: "",
  summary: "",
  intro: "",
  outcomes: [],
  highlights: STARTER_HIGHLIGHTS,
  imageUrl: null,
  durationMinutes: "150",
  capacity: "5",
  deposit: "25",
  balance: "374",
  showTeamSection: true,
  published: false,
};

function PointsEditor({
  label,
  hint,
  name,
  points,
  onChange,
}: {
  label: string;
  hint: string;
  name: string;
  points: WorkshopPoint[];
  onChange: (points: WorkshopPoint[]) => void;
}) {
  const set = (i: number, patch: Partial<WorkshopPoint>) => onChange(points.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, by: number) => {
    const next = [...points];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="pt-fieldset">
      <legend>{label}</legend>
      <p className="pt-muted pt-small">{hint}</p>
      <input type="hidden" name={name} value={JSON.stringify(points)} />
      {points.map((p, i) => (
        <div key={i} className="pt-point">
          <input
            aria-label={`${label} ${i + 1} heading`}
            value={p.title}
            onChange={(e) => set(i, { title: e.target.value })}
            placeholder="Heading"
            maxLength={120}
          />
          <textarea
            aria-label={`${label} ${i + 1} description`}
            value={p.description}
            onChange={(e) => set(i, { description: e.target.value })}
            placeholder="One or two sentences"
            rows={2}
            maxLength={600}
          />
          <div className="pt-point-actions">
            <button type="button" className="pt-btn pt-btn-secondary" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              ↑
            </button>
            <button
              type="button"
              className="pt-btn pt-btn-secondary"
              disabled={i === points.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Move down"
            >
              ↓
            </button>
            <button type="button" className="pt-btn pt-btn-secondary" onClick={() => onChange(points.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {points.length < 12 && (
        <button type="button" className="pt-btn pt-btn-secondary" onClick={() => onChange([...points, { title: "", description: "" }])}>
          Add a point
        </button>
      )}
    </fieldset>
  );
}

export function ProgrammeForm({ id, initial }: { id: number | null; initial: ProgrammeFormValues }) {
  const [state, action] = useActionState(saveProgramme.bind(null, id), undefined);
  const [deleteState, deleteAction] = useActionState(async () => (id == null ? undefined : deleteProgramme(id)), undefined);
  const f = state?.fields;
  const v = (key: "slug" | "durationMinutes" | "capacity" | "deposit" | "balance") => f?.[key] ?? initial[key];
  const p = id == null ? "newp" : `p${id}`;

  const [category, setCategory] = useState(initial.category);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [intro, setIntro] = useState(initial.intro);
  const [outcomes, setOutcomes] = useState(initial.outcomes);
  const [highlights, setHighlights] = useState(initial.highlights);

  const starter = WORKSHOP_CATEGORIES.find((c) => c.value === category)?.starter;
  const useStarter = () => {
    if (!starter) return;
    setTitle(starter.title);
    setSummary(starter.summary);
    setIntro(starter.intro);
    setOutcomes(starter.outcomes);
  };
  const pickCategory = (value: string) => {
    setCategory(value);
    // A new workshop starts from the type's starter text, unless Monika has written her own.
    const previous = WORKSHOP_CATEGORIES.find((c) => c.value === category)?.starter;
    const untouched = !title || title === previous?.title;
    const next = WORKSHOP_CATEGORIES.find((c) => c.value === value)?.starter;
    if (id == null && untouched && next) {
      setTitle(next.title);
      setSummary(next.summary);
      setIntro(next.intro);
      setOutcomes(next.outcomes);
    }
  };

  return (
    <form action={action} className="pt-form">
      <div className="pt-field">
        <label htmlFor={`${p}-category`}>Type of workshop</label>
        <select id={`${p}-category`} name="category" value={category} onChange={(e) => pickCategory(e.target.value)} required>
          <option value="" disabled>
            Choose a type…
          </option>
          {WORKSHOP_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {id == null ? (
          <p className="pt-muted pt-small">Picking a type fills in starter text below — change anything you like.</p>
        ) : (
          starter && (
            <button type="button" className="pt-btn pt-btn-secondary pt-self-start" onClick={useStarter}>
              Replace the text with this type&apos;s starter text
            </button>
          )
        )}
        <FieldError state={state} name="category" />
      </div>

      <div className="pt-field">
        <label htmlFor={`${p}-title`}>Title</label>
        <input id={`${p}-title`} name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        <FieldError state={state} name="title" />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-summary`}>One-line summary</label>
        <input
          id={`${p}-summary`}
          name="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={240}
          placeholder="Shown on the workshops listing"
        />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-intro`}>Introduction</label>
        <textarea
          id={`${p}-intro`}
          name="intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={4}
          maxLength={1500}
          placeholder="The paragraph at the top of the workshop's page"
          required
        />
        <FieldError state={state} name="intro" />
      </div>

      <PointsEditor
        label="What will you achieve?"
        hint="The outcomes people get from the workshop. Shown as cards."
        name="outcomes"
        points={outcomes}
        onChange={setOutcomes}
      />
      <PointsEditor
        label="Workshop details"
        hint="Format and what's included. The length is added automatically."
        name="highlights"
        points={highlights}
        onChange={setHighlights}
      />
      <FieldError state={state} name="points" />

      <div className="pt-field">
        <label htmlFor={`${p}-image`}>Image (optional)</label>
        {initial.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={initial.imageUrl} alt="" className="pt-programme-image" />
        )}
        <input id={`${p}-image`} name="image" type="file" accept="image/png,image/jpeg,image/webp" />
        <p className="pt-muted pt-small">PNG, JPG or WebP up to 5 MB, ideally 3:2 landscape. Without one, a branded title card is shown.</p>
        {initial.imageUrl && (
          <label className="pt-check">
            <input type="checkbox" name="removeImage" />
            <span>Remove the current image</span>
          </label>
        )}
        <FieldError state={state} name="image" />
      </div>

      <h3 className="pt-subhead">Defaults for new dates</h3>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor={`${p}-durationMinutes`}>Length (minutes)</label>
          <input id={`${p}-durationMinutes`} name="durationMinutes" type="number" min={15} max={1440} step={5} defaultValue={v("durationMinutes")} required />
          <FieldError state={state} name="durationMinutes" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-capacity`}>Places</label>
          <input id={`${p}-capacity`} name="capacity" type="number" min={1} max={500} defaultValue={v("capacity")} placeholder="No limit" />
          <FieldError state={state} name="capacity" />
        </div>
      </div>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor={`${p}-deposit`}>Deposit (£)</label>
          <input id={`${p}-deposit`} name="deposit" inputMode="decimal" defaultValue={v("deposit")} required />
          <FieldError state={state} name="deposit" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-balance`}>Balance (£)</label>
          <input id={`${p}-balance`} name="balance" inputMode="decimal" defaultValue={v("balance")} required />
          <FieldError state={state} name="balance" />
        </div>
      </div>

      <div className="pt-field">
        <label htmlFor={`${p}-slug`}>Web address (optional)</label>
        <input id={`${p}-slug`} name="slug" defaultValue={v("slug")} placeholder="Made from the title if blank" maxLength={60} />
        <p className="pt-muted pt-small">The page will be at /workshop/{v("slug") || "…"}. Changing it breaks links you&apos;ve already shared.</p>
        <FieldError state={state} name="slug" />
      </div>
      <label className="pt-check">
        <input type="checkbox" name="showTeamSection" defaultChecked={f ? f.showTeamSection === "on" : initial.showTeamSection} />
        <span>Show the &ldquo;Training a team?&rdquo; section on the page</span>
      </label>
      <label className="pt-check">
        <input type="checkbox" name="published" defaultChecked={f ? f.published === "on" : initial.published} />
        <span>Publish — show this workshop on the public workshops page</span>
      </label>

      <FormMessage state={state} />
      <div className="pt-btn-row">
        <SubmitButton>{id == null ? "Create workshop" : "Save changes"}</SubmitButton>
        {id != null && (
          <button
            type="submit"
            formAction={deleteAction}
            formNoValidate
            className="pt-btn pt-btn-danger"
            onClick={(e) => {
              if (!confirm("Delete this workshop? This can't be undone.")) e.preventDefault();
            }}
          >
            Delete workshop
          </button>
        )}
      </div>
      <FormMessage state={deleteState} />
    </form>
  );
}
