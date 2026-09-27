/** What the public workshop page offers, passed from the server page to client components. */
export type WorkshopOffer = {
  /** Null when no dated run is published (legacy single-workshop checkout). */
  slug: string | null;
  name: string;
  startsAt: string | null;
  durationMinutes: number;
  location: string | null;
  depositPence: number;
  balancePence: number;
  /** Null means no seat limit. */
  seatsLeft: number | null;
};

export const FALLBACK_OFFER: WorkshopOffer = {
  slug: null,
  name: "Value Selling Workshop",
  startsAt: null,
  durationMinutes: 150,
  location: null,
  depositPence: 2500,
  balancePence: 37400,
  seatsLeft: null,
};

/** The date to suggest first: the soonest one with places left. */
export function firstBookable(offers: WorkshopOffer[]) {
  return offers.find((o) => o.seatsLeft !== 0) ?? offers[0] ?? FALLBACK_OFFER;
}

export function placesLabel(seatsLeft: number | null) {
  if (seatsLeft == null) return null;
  return seatsLeft === 0 ? "Fully booked" : `${seatsLeft} ${seatsLeft === 1 ? "place" : "places"} left`;
}
