import "server-only";
import type { WorkshopWithSeats } from "@/lib/workshops";
import type { WorkshopOffer } from "@/lib/workshop-offer";

/** A run as the public pages' client components see it. */
export function toOffer(w: WorkshopWithSeats): WorkshopOffer {
  return {
    slug: w.slug,
    name: w.name,
    startsAt: w.startsAt?.toISOString() ?? null,
    durationMinutes: w.durationMinutes,
    location: w.location,
    depositPence: w.depositPence,
    balancePence: w.balancePence,
    seatsLeft: w.seatsLeft,
  };
}
