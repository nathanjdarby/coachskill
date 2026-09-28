import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckoutBanner } from "@/components/CheckoutBanner";
import { TeamTraining } from "@/components/TeamTraining";
import { WorkshopArt } from "@/components/WorkshopArt";
import { formatPence } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { categoryLabel } from "@/lib/workshop-categories";
import { placesLabel } from "@/lib/workshop-offer";
import { listPublishedProgrammes, programmeImageUrl } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshops | Coach Skill",
  description:
    "Small-group workshops with Monika Kozlowska on value selling, leadership, presenting and more — practical training you can use straight away.",
};

export default async function WorkshopsPage() {
  const programmes = await listPublishedProgrammes();

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
              <div className="workshop-cards">
                {programmes.map((p) => {
                  const next = p.upcoming.find((w) => w.seatsLeft !== 0) ?? p.upcoming[0];
                  const more = p.upcoming.length - 1;
                  const image = programmeImageUrl(p);
                  const deposit = p.upcoming.length ? Math.min(...p.upcoming.map((w) => w.depositPence)) : p.depositPence;
                  return (
                    <Link key={p.id} href={`/workshop/${p.slug}`} className="workshop-card">
                      <div className="workshop-card-media">
                        {image ? (
                          <Image src={image} alt="" width={800} height={533} unoptimized />
                        ) : (
                          <WorkshopArt category={categoryLabel(p.category)} title={p.title} />
                        )}
                      </div>
                      <div className="workshop-card-body">
                        <p className="eyebrow">{categoryLabel(p.category)}</p>
                        <h2>{p.title}</h2>
                        {p.summary && <p className="workshop-card-summary">{p.summary}</p>}
                        <p className="workshop-card-when">
                          {next?.startsAt ? (
                            <>
                              <span>{formatDateTime(next.startsAt)}</span>
                              {next.seatsLeft != null && (
                                <span className={next.seatsLeft === 0 ? "is-full" : next.seatsLeft <= 2 ? "is-low" : ""}>
                                  {placesLabel(next.seatsLeft)}
                                </span>
                              )}
                              {more > 0 && <span>+{more} more {more === 1 ? "date" : "dates"}</span>}
                            </>
                          ) : (
                            <span>New dates coming soon</span>
                          )}
                        </p>
                        <p className="workshop-card-foot">
                          {p.upcoming.length > 0 && <span>Deposit from {formatPence(deposit)}</span>}
                          <span className="workshop-card-link">
                            View workshop <span aria-hidden>→</span>
                          </span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
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
