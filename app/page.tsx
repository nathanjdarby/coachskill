import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { Coach } from "@/components/Coach";
import { WorkshopDetails } from "@/components/WorkshopDetails";
import { Footer } from "@/components/Footer";
import { CheckoutBanner } from "@/components/CheckoutBanner";

export default function Home() {
  return (
    <>
      <Header />
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
      </main>
      <Footer />
    </>
  );
}
