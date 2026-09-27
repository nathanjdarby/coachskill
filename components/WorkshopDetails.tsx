import type { WorkshopOffer } from "@/lib/workshop-offer";
import { WorkshopBooking } from "./WorkshopBooking";

const WORKSHOP_ITEMS = [
  {
    title: "2.5 hours",
    description:
      "Focused and practical — you leave with a pitch you can use straight away.",
  },
  {
    title: "Small group, max 5",
    description:
      "Enough people to practise with, small enough that every pitch gets personal feedback.",
  },
  {
    title: "Learn from each other",
    description:
      "Hear how others sell, swap what works and grow your network.",
  },
  {
    title: "Keep the momentum",
    description:
      "Continue with group mentoring or 1:1 coaching as part of the wider Coach Skill programme.",
  },
];

function hoursLabel(minutes: number) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hours`;
}

export function WorkshopDetails({ offers, featured }: { offers: WorkshopOffer[]; featured: WorkshopOffer }) {
  const items = [{ ...WORKSHOP_ITEMS[0], title: hoursLabel(featured.durationMinutes) }, ...WORKSHOP_ITEMS.slice(1)];
  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">
          Workshop <span>details</span>
        </h2>
        <WorkshopBooking offers={offers} />
        <div className="workshop-info workshop-info-grid">
          {items.map((item) => (
            <div key={item.title} className="workshop-item">
              <div className="check" />
              <div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
