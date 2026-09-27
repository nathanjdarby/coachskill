import type { Appointment } from "@/lib/db/schema";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNote, deleteSession, sendAdminMessage } from "@/app/actions/admin";
import { cancelSessionAsAdmin } from "@/app/actions/booking";
import {
  ConfirmSubmit,
  DeleteClientForm,
  EditClientForm,
  InviteButton,
  NoteForm,
  RecordPackageForm,
  SessionForm,
} from "@/components/admin/ClientForms";
import { PackageMeter } from "@/components/portal/PackageMeter";
import { AccessBadge, KindBadge, StatusBadge } from "@/components/portal/AccessBadge";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { MessageComposer, MessageThread } from "@/components/portal/MessageThread";
import { requireAdmin } from "@/lib/dal";
import { EnquiryAnswers } from "@/components/EnquiryAnswers";
import { workshopBookingsFor } from "@/lib/attendees";
import { formatPence } from "@/lib/money";
import { COACHING_SLUG, listEventTypes } from "@/lib/event-types";
import { activeCredit, listPackages, packageBalances } from "@/lib/packages";
import { getClientDetail, markMessagesRead, splitSessions } from "@/lib/portal";
import { formatDate, formatDateTime } from "@/lib/time";

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const detail = await getClientDetail(id);
  if (!detail) notFound();
  await markMessagesRead(id, "admin");

  const { client, user, access, discovery, notes, sessions, messages } = detail;
  const { upcoming, past } = splitSessions(sessions);
  const [balances, catalogue, bookings] = await Promise.all([packageBalances(id), listPackages(), workshopBookingsFor(client)]);
  const credit = activeCredit(balances);
  const creditOptions = balances
    .filter((b) => b.remaining > 0)
    .map((b) => ({ id: b.id, label: `${b.name} (${b.remaining} of ${b.sessionCount} left)` }));
  const packageNames = new Map(balances.map((b) => [b.id, b.name]));
  const eventTypeOptions = listEventTypes({ activeOnly: true }).map((t) => ({ id: t.id, label: t.name, slug: t.slug }));

  return (
    <div className="pt-page">
      <AutoRefresh seconds={30} />
      <Link href="/admin/clients" className="pt-link pt-small">
        ← All clients
      </Link>

      <div className="pt-page-head pt-client-head">
        <div>
          <h1>{client.fullName}</h1>
          <p className="pt-muted">
            {client.company ? `${client.company} · ` : ""}
            <a href={`mailto:${client.email}`} className="pt-link">
              {client.email}
            </a>
          </p>
          <div className="pt-badges">
            <StatusBadge status={client.status} />
            <KindBadge kind={client.kind} />
            <AccessBadge access={access} />
            <span className="pt-muted pt-small">Client since {formatDate(client.createdAt)}</span>
          </div>
        </div>
        <div className="pt-client-access">
          {access === "active" ? (
            <p className="pt-muted pt-small">
              {user?.lastLoginAt ? `Last signed in ${formatDateTime(user.lastLoginAt)}` : "Account created"}
            </p>
          ) : (
            <InviteButton
              clientId={client.id}
              name={client.fullName}
              email={client.email}
              hasDiscovery={Boolean(discovery)}
              label={access === "invited" ? "Resend invite" : "Invite to client area"}
            />
          )}
        </div>
      </div>

      <div className="pt-columns pt-columns-wide">
        <div className="pt-stack">
          <section className="pt-card" id="messages">
            <h2>Messages</h2>
            <MessageThread
              emptyText={`No messages yet. ${access === "active" ? "" : "They'll see messages once they create their account."}`}
              messages={messages.map((m) => ({
                id: m.message.id,
                body: m.message.body,
                mine: m.senderRole === "admin",
                senderName: m.senderName,
                sentAt: formatDateTime(m.message.createdAt),
              }))}
            />
            <MessageComposer action={sendAdminMessage.bind(null, client.id)} placeholder={`Message ${client.fullName.split(/\s+/)[0]}…`} />
          </section>

          <section className="pt-card" id="notes">
            <h2>Notes &amp; updates</h2>
            <NoteForm clientId={client.id} canShare={access === "active"} />
            {notes.length > 0 && (
              <ul className="pt-notes">
                {notes.map(({ note, authorName }) => (
                  <li key={note.id} className="pt-note">
                    <div className="pt-note-meta">
                      <span className={`pt-badge ${note.shared ? "is-ok" : ""}`}>
                        {note.shared ? "Shared with client" : "Private"}
                      </span>
                      <span className="pt-muted pt-small">
                        {authorName} · {formatDateTime(note.createdAt)}
                      </span>
                      <form action={deleteNote.bind(null, note.id, client.id)} className="pt-push">
                        <ConfirmSubmit
                          label="Delete"
                          confirmText={note.shared ? "Delete this update? The client will no longer see it." : "Delete this note?"}
                        />
                      </form>
                    </div>
                    <p className="pt-prewrap">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="pt-stack">
          <section className="pt-card" id="sessions">
            <h2>Sessions</h2>
            {upcoming.length === 0 && past.length === 0 && <p className="pt-muted">No sessions yet.</p>}
            {upcoming.length > 0 && (
              <>
                <h3 className="pt-subhead">Upcoming</h3>
                <SessionList sessions={upcoming} clientId={client.id} packageNames={packageNames} />
              </>
            )}
            {past.length > 0 && (
              <>
                <h3 className="pt-subhead">Past</h3>
                <SessionList sessions={past} clientId={client.id} packageNames={packageNames} />
              </>
            )}
            <details className="pt-inline-details">
              <summary className="pt-link">+ Add a session</summary>
              <SessionForm
                clientId={client.id}
                packageOptions={creditOptions}
                defaultPackageId={credit?.id ?? null}
                typeOptions={eventTypeOptions}
                defaultTypeId={eventTypeOptions.find((o) => o.slug === COACHING_SLUG)?.id ?? null}
              />
            </details>
          </section>

          {bookings.length > 0 && (
            <section className="pt-card" id="workshops">
              <h2>Workshop bookings</h2>
              <ul className="pt-sessions">
                {bookings.map(({ signup, workshop }) => (
                  <li key={signup.id} className="pt-session">
                    <div>
                      <p className="pt-session-title">{workshop.name}</p>
                      <p className="pt-muted pt-small">
                        {workshop.startsAt ? formatDateTime(workshop.startsAt) : "Date to be set"}
                        {workshop.location ? ` · ${workshop.location}` : ""}
                      </p>
                    </div>
                    <span className={`pt-badge ${signup.balancePaidAt ? "is-ok" : "is-warn"}`}>
                      {signup.balancePaidAt ? "Fully paid" : `Deposit paid · ${formatPence(signup.amountPaidPence)}`}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/workshops" className="pt-link pt-small pt-card-foot">
                Workshops →
              </Link>
            </section>
          )}

          <section className="pt-card" id="packages">
            <h2>Packages</h2>
            {balances.length === 0 ? (
              <p className="pt-muted">No packages yet. They can buy one from their client area, or record one below.</p>
            ) : (
              <ul className="pt-package-list">
                {balances.map((b) => (
                  <li key={b.id}>
                    <PackageMeter name={b.name} used={b.used} total={b.sessionCount} />
                    <p className="pt-muted pt-small">
                      {formatPence(b.pricePence)} · {b.source === "manual" ? "Recorded manually" : "Paid by card"}
                      {b.paidAt ? ` · ${formatDate(b.paidAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <details className="pt-inline-details">
              <summary className="pt-link">+ Record a package</summary>
              <RecordPackageForm
                clientId={client.id}
                options={catalogue.map((p) => ({ id: p.id, label: `${p.name} — ${p.sessionCount} sessions, ${formatPence(p.pricePence)}${p.active ? "" : " (hidden)"}` }))}
              />
            </details>
          </section>

          <section className="pt-card">
            <h2>Enquiry</h2>
            {discovery ? (
              <dl className="pt-dl pt-dl-stacked">
                <EnquiryAnswers enquiry={discovery} />
                <dt>Submitted</dt>
                <dd className="pt-muted">{formatDate(discovery.createdAt)}</dd>
              </dl>
            ) : (
              <p className="pt-muted">Added directly — no discovery call answers on file.</p>
            )}
          </section>

          <section className="pt-card">
            <h2>Details</h2>
            <EditClientForm
              clientId={client.id}
              fullName={client.fullName}
              email={client.email}
              company={client.company ?? ""}
              status={client.status}
              kind={client.kind}
              hasAccount={Boolean(user)}
            />
          </section>

          <details className="pt-card pt-details pt-danger-zone">
            <summary>
              <span className="pt-details-title">Delete client</span>
            </summary>
            <div className="pt-details-body">
              <DeleteClientForm clientId={client.id} fullName={client.fullName} />
            </div>
          </details>
        </div>
      </div>
      <p className="pt-sr-only">Signed in as {admin.name}</p>
    </div>
  );
}

function SessionList({
  sessions,
  clientId,
  packageNames,
}: {
  sessions: {
    id: number;
    title: string;
    startsAt: Date;
    durationMinutes: number;
    meetingUrl: string | null;
    clientPackageId: number | null;
    cancelledAt: Date | null;
    cancelledBy: Appointment["cancelledBy"];
    bookedBy: Appointment["bookedBy"];
  }[];
  clientId: number;
  packageNames: Map<number, string>;
}) {
  return (
    <ul className="pt-sessions">
      {sessions.map((s) => (
        <li key={s.id} className={`pt-session ${s.cancelledAt ? "is-cancelled" : ""}`}>
          <div>
            <p className="pt-session-title">{s.title}</p>
            <p className="pt-muted pt-small">
              {s.cancelledAt && `Cancelled by ${s.cancelledBy === "admin" ? "you" : "client"} · `}
              {!s.cancelledAt && s.bookedBy !== "admin" && "Booked by client · "}
              {formatDateTime(s.startsAt)} · {s.durationMinutes} min
              {s.clientPackageId && packageNames.has(s.clientPackageId) && ` · ${packageNames.get(s.clientPackageId)}`}
              {s.meetingUrl && (
                <>
                  {" · "}
                  <a href={s.meetingUrl} className="pt-link" target="_blank" rel="noreferrer">
                    Meeting link
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="pt-session-admin">
            {!s.cancelledAt && (
              <form action={cancelSessionAsAdmin.bind(null, s.id, clientId)}>
                <ConfirmSubmit
                  label="Cancel"
                  confirmText={`Cancel "${s.title}"? The client is emailed and any package session is returned.`}
                />
              </form>
            )}
            <form action={deleteSession.bind(null, s.id, clientId)}>
              <ConfirmSubmit label="Remove" confirmText={`Remove "${s.title}" completely? Nothing is emailed.`} />
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
