import Link from "next/link";

const TEAM_POINTS = [
  {
    title: "A private session for your people",
    description:
      "Up to 5 per group, just your team. Larger teams are split across sessions so everyone gets hands-on practice.",
  },
  {
    title: "Practise on your real pitches",
    description:
      "Your team works on the products, customers and objections they face every day — not generic examples.",
  },
  {
    title: "One shared way of selling",
    description:
      "Everyone learns the same value-led structure, so results don't depend on one star performer.",
  },
  {
    title: "Mentoring to make it stick",
    description:
      "Follow-up group mentoring keeps the new habits going long after the workshop ends.",
  },
];

export function TeamTraining() {
  return (
    <section className="section" id="teams">
      <div className="container team-training">
        <p className="eyebrow">For businesses &amp; teams</p>
        <h2 className="section-title">
          Training a <span>team</span>?
        </h2>
        <p className="section-lead team-lead">
          If several of your people pitch, present or sell, train them together.
          A team that learns side by side practises on each other, holds each
          other to it, and speaks to customers with one clear, consistent
          message.
        </p>
        <div className="team-points">
          {TEAM_POINTS.map((point) => (
            <div key={point.title} className="workshop-item">
              <div className="check" />
              <div>
                <h4>{point.title}</h4>
                <p>{point.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="team-cta">
          <Link href="/discovery-call" className="cta cta-hero">
            Enquire about team training <span aria-hidden>→</span>
          </Link>
          <p className="cta-subtext">
            Tell me about your team and I&apos;ll recommend the right format.
          </p>
        </div>
      </div>
    </section>
  );
}
