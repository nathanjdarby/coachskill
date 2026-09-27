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
import { FALLBACK_OFFER, type WorkshopOffer } from "@/lib/workshop-offer";
import { featuredWorkshop } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Value Selling Workshop | Coach Skill",
  description:
    "A focused 2.5-hour workshop that transforms how you pitch—from feature-heavy explanations to value-led storytelling.",
};

async function loadOffer(): Promise<WorkshopOffer> {
  const w = await featuredWorkshop();
  if (!w) return FALLBACK_OFFER;
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

export default async function WorkshopPage() {
  const offer = await loadOffer();
  return (
    <>
      <Header back />
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>
      <main>
        <Hero offer={offer} />
        <div className="section-connector" />
        <Benefits />
        <div className="section-connector" />
        <Coach />
        <div className="section-connector" />
        <WorkshopDetails offer={offer} />
        <div className="section-connector" />
        <TeamTraining />
      </main>
      <Footer />
    </>
  );
}
