import { SecurePlaceButton } from "./SecurePlaceButton";

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

export function WorkshopDetails() {
  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">
          Workshop <span>details</span>
        </h2>
        <div className="workshop-details">
          <div className="workshop-info">
            {WORKSHOP_ITEMS.map((item) => (
              <div key={item.title} className="workshop-item">
                <div className="check" />
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="payment-card">
            <h3>Payment</h3>
            <div className="price-row">
              <span className="label">Deposit now to secure your place</span>
              <span className="amount highlight">£25</span>
            </div>
            <div className="price-row">
              <span className="label">Balance (1 week prior to workshop)</span>
              <span className="amount">£374</span>
            </div>
            <SecurePlaceButton />
          </div>
        </div>
      </div>
    </section>
  );
}
