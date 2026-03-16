import { SecurePlaceButton } from "./SecurePlaceButton";

const WORKSHOP_ITEMS = [
  {
    title: "2.5 hours",
    description:
      "Focused, practical session designed for maximum impact.",
  },
  {
    title: "Small group workshop",
    description:
      "Maximum 5 participants for personalised attention and deep learning.",
  },
  {
    title: "Learn and network",
    description: "Built-in time to learn from others and expand your network.",
  },
  {
    title: "Wider Services Portfolio",
    description: "This workshop is part of the Wider Services Portfolio.",
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
