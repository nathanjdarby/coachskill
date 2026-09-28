import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { Coach } from "@/components/Coach";
import { WorkshopDetails } from "@/components/WorkshopDetails";
import { TeamTraining } from "@/components/TeamTraining";
import { Footer } from "@/components/Footer";
import { CheckoutBanner } from "@/components/CheckoutBanner";
import { currentUser } from "@/lib/dal";
import { categoryLabel, parsePoints } from "@/lib/workshop-categories";
import { firstBookable } from "@/lib/workshop-offer";
import { toOffer } from "@/lib/workshop-page";
import { getProgrammeBySlug, programmeImageUrl } from "@/lib/workshops";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> };

/** Published workshops for everyone; drafts only for the admin, as a preview. */
async function loadProgramme(slug: string) {
  const p = await getProgrammeBySlug(slug);
  if (!p) return null;
  if (p.published) return { programme: p, preview: false };
  const user = await currentUser();
  return user?.role === "admin" ? { programme: p, preview: true } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadProgramme((await params).slug);
  if (!loaded) return { title: "Workshop not found | Coach Skill" };
  const { programme: p } = loaded;
  return { title: `${p.title} | Coach Skill`, description: p.summary || p.intro.slice(0, 160) };
}

export default async function WorkshopPage({ params, searchParams }: Props) {
  const loaded = await loadProgramme((await params).slug);
  if (!loaded) notFound();
  const { programme: p, preview } = loaded;

  const offers = p.upcoming.map(toOffer);
  const { date } = await searchParams;
  // The date chosen on the listing leads the hero, if it's still bookable.
  const featured = offers.find((o) => o.slug === date && o.seatsLeft !== 0) ?? (offers.length ? firstBookable(offers) : null);
  const outcomes = parsePoints(p.outcomesJson);
  return (
    <>
      <Header back />
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>
      {preview && (
        <div className="checkout-banner checkout-banner--canceled" role="status">
          <p>
            <strong>Preview.</strong> This workshop isn&apos;t published yet, so only you can see this page.
          </p>
        </div>
      )}
      <main>
        <Hero
          content={{ title: p.title, intro: p.intro, imageUrl: programmeImageUrl(p), category: categoryLabel(p.category) }}
          offers={offers}
          featured={featured}
        />
        {outcomes.length > 0 && (
          <>
            <div className="section-connector" />
            <Benefits outcomes={outcomes} />
          </>
        )}
        <div className="section-connector" />
        <Coach />
        <div className="section-connector" />
        <WorkshopDetails
          offers={offers}
          durationMinutes={featured?.durationMinutes ?? p.durationMinutes}
          highlights={parsePoints(p.highlightsJson)}
          enquireHref="/discovery-call"
          initialSlug={date}
        />
        {p.showTeamSection && (
          <>
            <div className="section-connector" />
            <TeamTraining />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
