import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { WorkshopProgramme } from "@/lib/db/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckoutBanner } from "@/components/CheckoutBanner";
import { TeamTraining } from "@/components/TeamTraining";
import { WorkshopArt } from "@/components/WorkshopArt";
import { formatPence } from "@/lib/money";
import { formatTime, TIME_ZONE } from "@/lib/time";
import { categoryLabel } from "@/lib/workshop-categories";
import { placesLabel } from "@/lib/workshop-offer";
import { listPublishedProgrammes, programmeImageUrl } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshops | Coach Skill",
  description:
    "Small-group workshops with Monika Kozlowska on value selling, leadership, presenting and more — practical training you can use straight away.",
};

const badgeDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: TIME_ZONE });
const badgeMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: TIME_ZONE });
const badgeWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TIME_ZONE });

function hoursLabel(minutes: number) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? "hour" : "hours"}`;
}

/** The date pinned to the corner of a card's image. */
function DateBadge({ date }: { date: Date }) {
  return (
    <span className="workshop-date-badge" aria-hidden>
      <span className="workshop-date-badge-weekday">{badgeWeekday.format(date)}</span>
      <span className="workshop-date-badge-day">{badgeDay.format(date)}</span>
      <span className="workshop-date-badge-month">{badgeMonth.format(date)}</span>
    </span>
  );
}

function WorkshopCard({
  programme: p,
  href,
  date,
  children,
}: {
  programme: WorkshopProgramme;
  href: string;
  date?: Date;
  children: React.ReactNode;
}) {
  const image = programmeImageUrl(p);
  return (
    <Link href={href} className="workshop-card">
      <div className="workshop-card-media">
        {image ? (
          <Image src={image} alt="" width={800} height={533} unoptimized />
        ) : (
          <WorkshopArt category={categoryLabel(p.category)} title={p.title} />
        )}
        {date && <DateBadge date={date} />}
      </div>
      <div className="workshop-card-body">
        <p className="eyebrow">{categoryLabel(p.category)}</p>
        <h2>{p.title}</h2>
        {p.summary && <p className="workshop-card-summary">{p.summary}</p>}
        {children}
      </div>
    </Link>
  );
}

export default async function WorkshopsPage() {
  const programmes = await listPublishedProgrammes();
  // Every upcoming date is its own card, soonest first.
  const sessions = programmes
    .flatMap((programme) => programme.upcoming.filter((run) => run.startsAt).map((run) => ({ programme, run })))
    .sort((a, b) => a.run.startsAt!.getTime() - b.run.startsAt!.getTime());
  const undated = programmes.filter((p) => p.upcoming.length === 0);

  return (
    <>
      <Header back />
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>
      <main>
        <section className="section workshops-listing">
          <div className="container">
            <p className="eyebrow workshops-eyebrow">Small-group training</p>
            <h1 className="section-title">
              Upcoming <span>workshops</span>
            </h1>
            <p className="section-lead workshops-lead">
              Focused, practical sessions with Monika — small groups, real practice and skills you can use the next day.
            </p>

            {programmes.length === 0 ? (
              <div className="payment-card workshops-empty">
                <h3>New workshops coming soon</h3>
                <p className="cta-subtext">
                  Tell Monika what you&apos;re looking for and she&apos;ll let you know when the next one is.
                </p>
                <Link href="/discovery-call" className="cta">
                  Get in touch
                </Link>
              </div>
            ) : (
              <>
                {sessions.length === 0 ? (
                  <p className="section-lead workshops-lead">No dates are booked right now — see the workshops below.</p>
                ) : (
                  <div className="workshop-cards">
                    {sessions.map(({ programme: p, run }) => (
                      <WorkshopCard key={run.id} programme={p} date={run.startsAt!} href={`/workshop/${p.slug}?date=${encodeURIComponent(run.slug)}#dates`}>
                        <p className="workshop-card-when">
                          <span>{formatTime(run.startsAt!)}</span>
                          <span>{hoursLabel(run.durationMinutes)}</span>
                          {run.location && <span>{run.location}</span>}
                          {run.seatsLeft != null && (
                            <span className={run.seatsLeft === 0 ? "is-full" : run.seatsLeft <= 2 ? "is-low" : ""}>
                              {placesLabel(run.seatsLeft)}
                            </span>
                          )}
                        </p>
                        <p className="workshop-card-foot">
                          <span>{run.seatsLeft === 0 ? "Fully booked" : `Deposit ${formatPence(run.depositPence)}`}</span>
                          <span className="workshop-card-link">
                            {run.seatsLeft === 0 ? "View workshop" : "Book this date"} <span aria-hidden>→</span>
                          </span>
                        </p>
                      </WorkshopCard>
                    ))}
                  </div>
                )}

                {undated.length > 0 && (
                  <>
                    <h2 className="section-title workshops-subtitle">
                      Dates <span>coming soon</span>
                    </h2>
                    <div className="workshop-cards">
                      {undated.map((p) => (
                        <WorkshopCard key={p.id} programme={p} href={`/workshop/${p.slug}`}>
                          <p className="workshop-card-foot">
                            <span>New dates coming soon</span>
                            <span className="workshop-card-link">
                              Register interest <span aria-hidden>→</span>
                            </span>
                          </p>
                        </WorkshopCard>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
        <div className="section-connector" />
        <TeamTraining />
      </main>
      <Footer />
    </>
  );
}
