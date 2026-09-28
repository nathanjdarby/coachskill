import { DiscoveryScheduling, type SchedulingType } from "@/components/admin/DiscoveryScheduling";
import { isUpcoming, schedulingForDiscovery } from "@/lib/appointments";
import { availableSlots, groupSlotsByDay } from "@/lib/booking";
import type { DiscoveryCall } from "@/lib/db/schema";
import { durationFor, listEventTypes } from "@/lib/event-types";
import { hostJoinUrl } from "@/lib/join";
import { callPhone } from "@/lib/meeting";

/**
 * On a client's page (once Monika has decided to work with them): their discovery
 * call — send a booking link or book it yourself, by video or phone.
 */
export async function DiscoveryCallCard({ call, firstName, hostName }: { call: DiscoveryCall; firstName: string; hostName: string }) {
  const { appointments, link } = (await schedulingForDiscovery([call.id])).get(call.id) ?? { appointments: [], link: null };
  const hostLinks = new Map(await Promise.all(appointments.map(async (a) => [a.id, await hostJoinUrl(a, hostName)] as const)));
  // Types Monika can send, with her free times for each.
  const types: SchedulingType[] = listEventTypes({ activeOnly: true })
    .filter((t) => t.audience === "invite_only")
    .map((t) => {
      const minutes = durationFor(t);
      return { id: t.id, label: t.name, minutes, days: groupSlotsByDay(availableSlots(minutes, { bufferMinutes: t.bufferMinutes })) };
    });
  const booked = appointments.some((a) => isUpcoming(a));

  return (
    <section className="pt-card" id="discovery-call">
      <h2>Discovery call</h2>
      <p className="pt-muted pt-small pt-card-sub">
        {booked
          ? "Booked — they've been emailed the details."
          : `Email ${firstName} a link to pick one of your free times, or book it yourself.${
              call.callPreference === "phone" ? " They'd prefer a phone call." : call.callPreference === "video" ? " They'd prefer video." : ""
            }`}
      </p>
      <DiscoveryScheduling
        discoveryCallId={call.id}
        firstName={firstName}
        types={types}
        appointments={appointments.map((a) => ({
          id: a.id,
          title: a.title,
          startsAt: a.startsAt,
          durationMinutes: a.durationMinutes,
          meetingUrl: hostLinks.get(a.id) ?? null,
          phone: callPhone(a),
          cancelledAt: a.cancelledAt,
          upcoming: isUpcoming(a),
          colour: a.typeColour,
        }))}
        link={link && { id: link.id, url: link.url, expiresAt: link.expiresAt }}
        phone={call.phone}
        prefersPhone={call.callPreference === "phone"}
        showCallNow={false}
      />
    </section>
  );
}
