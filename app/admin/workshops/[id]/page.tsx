import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgrammeForm } from "@/components/admin/ProgrammeForm";
import { toChoice, WorkshopDates } from "@/components/admin/WorkshopDatesTable";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { newDateFor } from "@/lib/workshop-form";
import { requireAdmin } from "@/lib/dal";
import { categoryLabel, parsePoints } from "@/lib/workshop-categories";
import { getProgramme, listProgrammesForAdmin, listWorkshopsForAdmin, programmeImageUrl } from "@/lib/workshops";

export default async function AdminProgrammePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const p = await getProgramme(id);
  if (!p) notFound();
  const [{ created }, programmes, runs] = await Promise.all([searchParams, listProgrammesForAdmin(), listWorkshopsForAdmin()]);
  const dates = runs.filter((w) => w.programmeId === p.id);

  return (
    <div className="pt-page">
      <Link href="/admin/workshops" className="pt-link pt-small">
        ← All workshops
      </Link>

      <div className="pt-page-head">
        <h1>{p.title}</h1>
        <p className="pt-muted">
          {categoryLabel(p.category)} ·{" "}
          <Link href={`/workshop/${p.slug}`} className="pt-link" target="_blank">
            {p.published ? "View page" : "Preview page"} ↗
          </Link>
        </p>
        <div className="pt-badges">
          <span className={`pt-badge ${p.published ? "is-ok" : "is-warn"}`}>{p.published ? "Published" : "Draft"}</span>
        </div>
      </div>

      {created && (
        <div role="status" className="pt-alert is-ok">
          <p>
            Workshop created. Its page is at /workshop/{p.slug}
            {p.published ? "" : " — only you can see it until you publish it"}. Now add a date so people can book.
          </p>
        </div>
      )}

      <h2 className="pt-subhead">Dates</h2>
      <details className="pt-card pt-details" open={Boolean(created)}>
        <summary>
          <span className="pt-details-title">Add a date</span>
          <span className="pt-muted pt-small">Starts from this workshop&apos;s length, places and prices</span>
        </summary>
        <div className="pt-details-body">
          <WorkshopForm id={null} initial={newDateFor(p)} programmes={programmes.map(toChoice)} />
        </div>
      </details>
      <WorkshopDates runs={dates} emptyText="No upcoming dates — the page shows “New dates coming soon” until you add one." />

      <h2 className="pt-subhead">Page content</h2>
      <section className="pt-card">
        <ProgrammeForm
          id={p.id}
          initial={{
            category: p.category,
            title: p.title,
            slug: p.slug,
            summary: p.summary,
            intro: p.intro,
            outcomes: parsePoints(p.outcomesJson),
            highlights: parsePoints(p.highlightsJson),
            imageUrl: programmeImageUrl(p),
            durationMinutes: String(p.durationMinutes),
            capacity: p.capacity == null ? "" : String(p.capacity),
            deposit: String(p.depositPence / 100),
            balance: String(p.balancePence / 100),
            showTeamSection: p.showTeamSection,
            published: p.published,
          }}
        />
      </section>
    </div>
  );
}
