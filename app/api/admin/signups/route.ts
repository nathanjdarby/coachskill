import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSignupsWithWorkshop } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workshop = searchParams.get("workshop");
  const status = searchParams.get("status");

  const workshopId =
    workshop && workshop !== "all" ? parseInt(workshop, 10) : undefined;
  const statusFilter =
    status && status !== "all" ? status : undefined;

  const rows = await listSignupsWithWorkshop({
    workshopId: Number.isFinite(workshopId) ? workshopId : undefined,
    status: statusFilter,
  });

  return NextResponse.json({ signups: rows });
}
