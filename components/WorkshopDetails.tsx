import type { WorkshopPoint } from "@/lib/workshop-categories";
import type { WorkshopOffer } from "@/lib/workshop-offer";
import { WorkshopBooking } from "./WorkshopBooking";

function hoursLabel(minutes: number) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hours`;
}

export function WorkshopDetails({
  offers,
  durationMinutes,
  highlights,
  enquireHref,
}: {
  offers: WorkshopOffer[];
  durationMinutes: number;
  highlights: WorkshopPoint[];
  enquireHref: string;
}) {
  const items = [
    { title: hoursLabel(durationMinutes), description: "Focused and practical — you leave with skills you can use straight away." },
    ...highlights,
  ];
  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">
          Workshop <span>details</span>
        </h2>
        {offers.length > 0 ? (
          <WorkshopBooking offers={offers} />
        ) : (
          <div className="workshop-book" id="dates">
            <div className="payment-card">
              <h3>New dates coming soon</h3>
              <p className="cta-subtext">There are no dates booked for this workshop right now. Tell Monika you&apos;re interested and she&apos;ll let you know when the next one is.</p>
              <a href={enquireHref} className="cta">
                Register your interest
              </a>
            </div>
          </div>
        )}
        <div className="workshop-info workshop-info-grid">
          {items.map((item, i) => (
            <div key={`${i}-${item.title}`} className="workshop-item">
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
