// Shared by the admin date form (a client component) and the server pages that render it.

export type WorkshopFormValues = {
  programmeId: string;
  name: string;
  slug: string;
  startsAt: string;
  durationMinutes: string;
  location: string;
  locationMode: "jitsi" | "custom" | "in_person";
  meetingUrl: string;
  capacity: string;
  deposit: string;
  balance: string;
  published: boolean;
};

/** A workshop a date can belong to, with the defaults a new date starts from. */
export type ProgrammeChoice = {
  id: number;
  title: string;
  durationMinutes: number;
  capacity: number | null;
  depositPence: number;
  balancePence: number;
};

export const NEW_WORKSHOP: WorkshopFormValues = {
  programmeId: "",
  name: "",
  slug: "",
  startsAt: "",
  durationMinutes: "150",
  location: "",
  locationMode: "jitsi",
  meetingUrl: "",
  capacity: "5",
  deposit: "25",
  balance: "374",
  published: true,
};

/** A new date's starting values for the chosen workshop. */
export function newDateFor(p: ProgrammeChoice): WorkshopFormValues {
  return {
    ...NEW_WORKSHOP,
    programmeId: String(p.id),
    durationMinutes: String(p.durationMinutes),
    capacity: p.capacity == null ? "" : String(p.capacity),
    deposit: String(p.depositPence / 100),
    balance: String(p.balancePence / 100),
  };
}
