import Link from "next/link";
import { deleteEventType } from "@/app/actions/scheduling";
import { ConfirmSubmit } from "@/components/admin/ClientForms";
import { EventTypeForm, NEW_EVENT_TYPE } from "@/components/admin/EventTypeForms";
import { requireAdmin } from "@/lib/dal";
import { BUILT_IN_SLUGS, COACHING_SLUG, listEventTypes } from "@/lib/event-types";

const AUDIENCE_LABEL = {
  clients_with_credits: "Clients book with package sessions",
  invite_only: "By appointment or booking link",
  admin_only: "Added by you",
} as const;

const LOCATION_LABEL = { jitsi: "Private video room", custom: "Your meeting link", in_person: "In person" } as const;

export default async function EventTypesPage() {
  await requireAdmin();
  const types = listEventTypes();

  return (
    <div className="pt-page pt-narrow">
      <Link href="/admin/scheduling" className="pt-link pt-small">
        ← Scheduling
      </Link>
      <div className="pt-page-head">
        <h1>Booking types</h1>
        <p className="pt-muted">The kinds of appointment you offer — their length, who can book and where they happen.</p>
      </div>

      <details className="pt-card pt-details">
        <summary>
          <span className="pt-details-title">Add a booking type</span>
          <span className="pt-muted pt-small">e.g. a follow-up call or a longer strategy session</span>
        </summary>
        <div className="pt-details-body">
          <EventTypeForm id={null} initial={NEW_EVENT_TYPE} />
        </div>
      </details>

      {types.map((t) => {
        const builtIn = BUILT_IN_SLUGS.includes(t.slug);
        return (
          <section key={t.id} className="pt-card">
            <div className="pt-card-head">
              <h2 className="et-name">
                <span className="cal-dot" style={{ background: t.colour }} aria-hidden />
                {t.name}
              </h2>
              <span className={`pt-badge ${t.active ? "is-ok" : ""}`}>{t.active ? "Active" : "Hidden"}</span>
            </div>
            <p className="pt-muted pt-small">
              {t.durationMinutes ? `${t.durationMinutes} min` : "Length from package"} · {AUDIENCE_LABEL[t.audience]} ·{" "}
              {LOCATION_LABEL[t.locationMode]}
              {builtIn ? " · Built in" : ""}
            </p>
            <details className="pt-details pt-details-inline">
              <summary>
                <span className="pt-details-title">Edit</span>
              </summary>
              <div className="pt-details-body">
                <EventTypeForm
                  id={t.id}
                  builtIn={builtIn}
                  packageLength={t.slug === COACHING_SLUG}
                  initial={{
                    name: t.name,
                    durationMinutes: t.durationMinutes == null ? "" : String(t.durationMinutes),
                    bufferMinutes: t.bufferMinutes == null ? "" : String(t.bufferMinutes),
                    audience: t.audience,
                    locationMode: t.locationMode,
                    customUrl: t.customUrl ?? "",
                    colour: t.colour,
                    active: t.active,
                  }}
                />
                {!builtIn && (
                  <form action={deleteEventType.bind(null, t.id)} className="pt-mt">
                    <ConfirmSubmit label="Delete booking type" confirmText={`Delete "${t.name}"? If it has bookings it will be hidden instead.`} />
                  </form>
                )}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
