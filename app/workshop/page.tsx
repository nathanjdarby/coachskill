import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { Coach } from "@/components/Coach";
import { WorkshopDetails } from "@/components/WorkshopDetails";
import { TeamTraining } from "@/components/TeamTraining";
import { Footer } from "@/components/Footer";
import { CheckoutBanner } from "@/components/CheckoutBanner";
import { FALLBACK_OFFER, firstBookable, type WorkshopOffer } from "@/lib/workshop-offer";
import { listUpcomingWorkshops } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Value Selling Workshop | Coach Skill",
  description:
    "A focused 2.5-hour workshop that transforms how you pitch—from feature-heavy explanations to value-led storytelling.",
};

/** Every upcoming published date, soonest first; the original single offer if none are set. */
async function loadOffers(): Promise<WorkshopOffer[]> {
  const runs = await listUpcomingWorkshops();
  if (runs.length === 0) return [FALLBACK_OFFER];
  return runs.map((w) => ({
    slug: w.slug,
    name: w.name,
    startsAt: w.startsAt?.toISOString() ?? null,
    durationMinutes: w.durationMinutes,
    location: w.location,
    depositPence: w.depositPence,
    balancePence: w.balancePence,
    seatsLeft: w.seatsLeft,
  }));
}

export default async function WorkshopPage() {
  const offers = await loadOffers();
  const featured = firstBookable(offers);
  return (
    <>
      <Header back />
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>
      <main>
        <Hero offers={offers} featured={featured} />
        <div className="section-connector" />
        <Benefits />
        <div className="section-connector" />
        <Coach />
        <div className="section-connector" />
        <WorkshopDetails offers={offers} featured={featured} />
        <div className="section-connector" />
        <TeamTraining />
      </main>
      <Footer />
    </>
  );
}
