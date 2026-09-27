import { deleteAvailabilityBlock, deleteAvailabilityRule } from "@/app/actions/booking";
import { BlockForm, RuleForm, SettingsForm } from "@/components/admin/AvailabilityForms";
import { ConfirmSubmit } from "@/components/admin/ClientForms";
import { getBookingSettings, listAvailabilityRules, listUpcomingBlocks } from "@/lib/booking";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/time";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export default async function AdminAvailabilityPage() {
  await requireAdmin();
  const rules = listAvailabilityRules();
  const blocks = listUpcomingBlocks();
  const settings = getBookingSettings();

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Availability</h1>
        <p className="pt-muted">
          When clients with a package can book sessions themselves. Your existing sessions and workshops are kept free
          automatically. All times are UK time.
        </p>
      </div>

      <section className="pt-card">
        <h2>Weekly hours</h2>
        {rules.length === 0 ? (
          <p className="pt-muted">No hours yet — clients can&apos;t book until you add some.</p>
        ) : (
          <ul className="pt-hours">
            {ORDER.filter((d) => rules.some((r) => r.weekday === d)).map((d) => (
              <li key={d}>
                <span className="pt-hours-day">{DAY_NAMES[d]}</span>
                <span className="pt-hours-ranges">
                  {rules
                    .filter((r) => r.weekday === d)
                    .map((r) => (
                      <span key={r.id} className="pt-hours-range">
                        {hhmm(r.startMinute)}–{hhmm(r.endMinute)}
                        <form action={deleteAvailabilityRule.bind(null, r.id)}>
                          <ConfirmSubmit label="×" confirmText={`Remove ${DAY_NAMES[d]} ${hhmm(r.startMinute)}–${hhmm(r.endMinute)}?`} />
                        </form>
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <details className="pt-inline-details" open={rules.length === 0}>
          <summary className="pt-link">+ Add hours</summary>
          <RuleForm />
        </details>
      </section>

      <section className="pt-card">
        <h2>Time off</h2>
        {blocks.length === 0 ? (
          <p className="pt-muted">No time off booked.</p>
        ) : (
          <ul className="pt-sessions">
            {blocks.map((b) => (
              <li key={b.id} className="pt-session">
                <div>
                  <p className="pt-session-title">{b.reason || "Unavailable"}</p>
                  <p className="pt-muted pt-small">
                    {formatDateTime(b.startsAt)} → {formatDateTime(b.endsAt)}
                  </p>
                </div>
                <form action={deleteAvailabilityBlock.bind(null, b.id)}>
                  <ConfirmSubmit label="Remove" confirmText="Remove this time off?" />
                </form>
              </li>
            ))}
          </ul>
        )}
        <details className="pt-inline-details">
          <summary className="pt-link">+ Add time off</summary>
          <BlockForm />
        </details>
      </section>

      <section className="pt-card">
        <h2>Booking rules</h2>
        <SettingsForm
          initial={{
            bufferMinutes: settings.bufferMinutes,
            minNoticeHours: settings.minNoticeHours,
            maxAdvanceDays: settings.maxAdvanceDays,
            slotStepMinutes: settings.slotStepMinutes,
            cancelCutoffHours: settings.cancelCutoffHours,
            defaultMeetingUrl: settings.defaultMeetingUrl ?? "",
          }}
        />
      </section>
    </div>
  );
}
