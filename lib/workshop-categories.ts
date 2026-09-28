/** A titled line on a workshop page ("What will you achieve?" and "Workshop details"). */
export type WorkshopPoint = { title: string; description: string };

export type WorkshopCategory = {
  value: string;
  label: string;
  /** Starter content filled in when Monika picks this type for a new workshop. */
  starter: { title: string; summary: string; intro: string; outcomes: WorkshopPoint[] };
};

const SMALL_GROUP: WorkshopPoint[] = [
  {
    title: "Small group, max 5",
    description: "Enough people to practise with, small enough that everyone gets personal feedback.",
  },
  { title: "Learn from each other", description: "Hear how others work, swap what works and grow your network." },
  {
    title: "Keep the momentum",
    description: "Continue with group mentoring or 1:1 coaching as part of the wider Coach Skill programme.",
  },
];

/** The starter "Workshop details" for every type; the length is added from the date's duration. */
export const STARTER_HIGHLIGHTS = SMALL_GROUP;

// Values match the discovery form's interest options (lib/discovery.ts).
export const WORKSHOP_CATEGORIES: WorkshopCategory[] = [
  {
    value: "sales_methodologies",
    label: "Sales Methodologies Training",
    starter: {
      title: "Sales Methodologies Training",
      summary: "A proven, repeatable way to run every sales conversation from first call to close.",
      intro:
        "A practical small-group workshop on the sales methodologies top teams rely on — how to qualify, discover and move deals forward with a structure you can repeat every time.",
      outcomes: [
        { title: "A repeatable process", description: "Run every opportunity with the same clear steps, from first call to close." },
        { title: "Better qualification", description: "Spot the deals worth chasing early and stop spending time on the rest." },
        { title: "Sharper discovery", description: "Ask the questions that uncover the customer’s real challenges and priorities." },
        { title: "Predictable pipeline", description: "Know where every deal stands and what needs to happen next." },
      ],
    },
  },
  {
    value: "leadership",
    label: "Leadership Development",
    starter: {
      title: "Leadership Development",
      summary: "Lead with clarity and confidence, and get the best from the people around you.",
      intro:
        "A focused small-group workshop for new and growing leaders — how to set direction, have the difficult conversations and build a team that performs without you in every room.",
      outcomes: [
        { title: "Clear direction", description: "Set goals and expectations your team understands and acts on." },
        { title: "Confident conversations", description: "Handle feedback, performance and conflict calmly and fairly." },
        { title: "Trust and ownership", description: "Delegate well and build a team that takes responsibility." },
        { title: "Your leadership style", description: "Understand how you lead today and how to adapt it to the moment." },
      ],
    },
  },
  {
    value: "emotional_intelligence",
    label: "Emotional Intelligence & 360° Feedback",
    starter: {
      title: "Emotional Intelligence & 360° Feedback",
      summary: "Understand how you come across, read others better and stay composed under pressure.",
      intro:
        "A reflective, practical workshop combining emotional intelligence with 360° feedback — see yourself the way colleagues and customers do, and build the habits that strengthen every relationship.",
      outcomes: [
        { title: "Self-awareness", description: "See how you come across through honest, structured 360° feedback." },
        { title: "Composure under pressure", description: "Recognise your triggers and respond intentionally instead of reacting." },
        { title: "Reading people", description: "Pick up on what others feel and need, and adapt how you communicate." },
        { title: "Stronger relationships", description: "Build trust faster with colleagues, customers and your team." },
      ],
    },
  },
  {
    value: "enablement",
    label: "Sales Enablement & Onboarding",
    starter: {
      title: "Sales Enablement & Onboarding",
      summary: "Get new sellers confident and productive faster, with one consistent way of selling.",
      intro:
        "A hands-on workshop for sales leaders and enablement teams — how to onboard new starters, equip them with the right messages and tools, and shorten their time to first sale.",
      outcomes: [
        { title: "Faster ramp-up", description: "A clear onboarding path that gets new sellers selling sooner." },
        { title: "Consistent messaging", description: "Everyone tells the same value-led story about what you offer." },
        { title: "Content that gets used", description: "Build playbooks and tools your team actually reaches for." },
        { title: "Measurable progress", description: "Know what good looks like at each stage and track it." },
      ],
    },
  },
  {
    value: "value_selling",
    label: "Value Selling",
    starter: {
      title: "Value Selling Training",
      summary: "Turn feature-heavy pitches into value-led stories that keep customers engaged.",
      intro:
        "A focused small-group workshop that transforms how you pitch — from feature-heavy explanations to value-led storytelling that keeps customers engaged.",
      outcomes: [
        { title: "Pitch for results", description: "Pitch in a way that can increase your sales by up to 30%." },
        { title: "Clear structure", description: "A clear value-selling pitch structure that guides the customer through the conversation." },
        { title: "Value-led storytelling", description: "Replace feature-heavy explanations with value-led storytelling." },
        { title: "Simple language", description: "Use simple, human language so customers instantly understand what you’re offering." },
      ],
    },
  },
  {
    value: "presentation",
    label: "Presentation & Storytelling Skills",
    starter: {
      title: "Presentation & Storytelling Skills",
      summary: "Present with clarity and presence, and tell stories people remember.",
      intro:
        "A practical small-group workshop on presenting with confidence — structure your message, use stories that stick and hold the room from the first slide to the last.",
      outcomes: [
        { title: "A clear structure", description: "Shape any presentation so the message lands first time." },
        { title: "Stories that stick", description: "Use simple, memorable stories to make complex ideas easy to act on." },
        { title: "Presence and confidence", description: "Manage nerves and speak with authority in front of any audience." },
        { title: "Audience engagement", description: "Keep attention and move people towards a decision." },
      ],
    },
  },
  {
    value: "objections",
    label: "Objection Handling & Negotiation",
    starter: {
      title: "Objection Handling & Negotiation",
      summary: "Handle pushback calmly and negotiate outcomes that work for both sides.",
      intro:
        "A practical small-group workshop on the moments that make or break a deal — understanding the concern behind an objection and negotiating with confidence instead of discounting.",
      outcomes: [
        { title: "Calm under pushback", description: "Respond to objections with curiosity instead of defensiveness." },
        { title: "The real concern", description: "Uncover what’s behind an objection and address it directly." },
        { title: "Protect your price", description: "Negotiate on value and trade rather than discount." },
        { title: "Win-win outcomes", description: "Reach agreements customers are happy to sign and stick to." },
      ],
    },
  },
  {
    value: "sales_coaching",
    label: "Sales Coaching",
    starter: {
      title: "Sales Coaching",
      summary: "Coach your sellers to improve every week, not just at review time.",
      intro:
        "A hands-on workshop for sales managers — how to run coaching conversations that change behaviour, give feedback that lands and build a team that keeps getting better.",
      outcomes: [
        { title: "Coaching that sticks", description: "A simple structure for coaching conversations that change behaviour." },
        { title: "Useful feedback", description: "Give specific, balanced feedback your sellers can act on straight away." },
        { title: "Deal and skill coaching", description: "Know when to coach the deal and when to coach the person." },
        { title: "A coaching rhythm", description: "Build regular coaching into the week without it taking over." },
      ],
    },
  },
  {
    value: "team_development",
    label: "Team Development",
    starter: {
      title: "Team Development",
      summary: "Build a team that communicates well, trusts each other and pulls in the same direction.",
      intro:
        "An interactive workshop for teams who want to work better together — shared goals, clearer communication and the trust that lets people do their best work.",
      outcomes: [
        { title: "Shared goals", description: "Agree what the team is working towards and how you’ll get there." },
        { title: "Clearer communication", description: "Fewer misunderstandings and more open, honest conversations." },
        { title: "Trust and collaboration", description: "Understand each other’s strengths and how to work together." },
        { title: "Lasting habits", description: "Leave with agreed ways of working the whole team signs up to." },
      ],
    },
  },
  {
    value: "bespoke",
    label: "Bespoke Training",
    starter: {
      title: "Bespoke Training",
      summary: "Training designed around your team, your customers and your goals.",
      intro:
        "A workshop shaped around what your team needs — built from your real products, customers and challenges, so everything learned can be used straight away.",
      outcomes: [
        { title: "Built for you", description: "Content designed around your goals, not a generic course." },
        { title: "Real examples", description: "Practise on your own products, customers and situations." },
        { title: "Immediate impact", description: "Leave with skills and tools to use the next working day." },
      ],
    },
  },
];

export function categoryLabel(value: string) {
  return WORKSHOP_CATEGORIES.find((c) => c.value === value)?.label ?? "Workshop";
}

export function isCategory(value: string) {
  return WORKSHOP_CATEGORIES.some((c) => c.value === value);
}

/** Reads a stored points list, dropping anything malformed. */
export function parsePoints(json: string | null | undefined): WorkshopPoint[] {
  try {
    const v: unknown = JSON.parse(json ?? "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((p): p is WorkshopPoint => typeof p?.title === "string" && typeof p?.description === "string")
      .map((p) => ({ title: p.title, description: p.description }));
  } catch {
    return [];
  }
}
