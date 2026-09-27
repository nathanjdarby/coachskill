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

export const metadata: Metadata = {
  title: "Value Selling Workshop | Coach Skill",
  description:
    "A focused 2.5-hour workshop that transforms how you pitch—from feature-heavy explanations to value-led storytelling.",
};

export default function WorkshopPage() {
  return (
    <>
      <Header back />
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>
      <main>
        <Hero />
        <div className="section-connector" />
        <Benefits />
        <div className="section-connector" />
        <Coach />
        <div className="section-connector" />
        <WorkshopDetails />
        <div className="section-connector" />
        <TeamTraining />
      </main>
      <Footer />
    </>
  );
}
