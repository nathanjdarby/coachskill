"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, requireClient } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clientPackages, clients, packages } from "@/lib/db/schema";
import { getPackage } from "@/lib/packages";
import { createPackageCheckout } from "@/lib/payments/package";
import type { FormState } from "./types";

function text(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function poundsToPence(value: string) {
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}

function revalidatePackages() {
  revalidatePath("/admin/packages");
  revalidatePath("/portal");
  revalidatePath("/portal/sessions");
}

// — Admin —

/** Creates (id = null) or updates a package. Past purchases keep their own copy of the details. */
export async function savePackage(id: number | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    name: text(formData, "name", 120),
    description: text(formData, "description", 1000),
    price: text(formData, "price", 10),
    sessionCount: text(formData, "sessionCount", 3),
    sessionMinutes: text(formData, "sessionMinutes", 4),
    sortOrder: text(formData, "sortOrder", 4),
    active: formData.get("active") === "on" ? "on" : "",
  };
  const errors: Record<string, string> = {};
  const pricePence = poundsToPence(fields.price);
  const sessionCount = Number(fields.sessionCount);
  const sessionMinutes = Number(fields.sessionMinutes);
  const sortOrder = fields.sortOrder === "" ? 0 : Number(fields.sortOrder);
  if (!fields.name) errors.name = "Give the package a name.";
  if (pricePence === null || pricePence < 100) errors.price = "At least £1.";
  if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 100) errors.sessionCount = "Between 1 and 100.";
  if (!Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 480) errors.sessionMinutes = "Between 15 and 480 minutes.";
  if (!Number.isInteger(sortOrder)) errors.sortOrder = "A whole number.";
  if (Object.keys(errors).length || pricePence === null) return { errors, fields };

  const now = new Date();
  const values = {
    name: fields.name,
    description: fields.description || null,
    pricePence,
    sessionCount,
    sessionMinutes,
    sortOrder,
    active: fields.active === "on",
    updatedAt: now,
  };
  const db = getDb();
  if (id == null) {
    await db.insert(packages).values({ ...values, createdAt: now });
  } else if (db.update(packages).set(values).where(eq(packages.id, id)).run().changes !== 1) {
    return { ok: false, message: "Package not found." };
  }
  revalidatePackages();
  return { ok: true, message: id == null ? "Package created." : "Package saved." };
}

/** Deletes a package nobody has bought or started buying; otherwise hide it instead. */
export async function deletePackage(id: number) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(clientPackages).where(eq(clientPackages.packageId, id));
  if (row.n === 0) db.delete(packages).where(eq(packages.id, id)).run();
  else db.update(packages).set({ active: false, updatedAt: new Date() }).where(eq(packages.id, id)).run();
  revalidatePackages();
}

/** Records a package paid outside Stripe (e.g. invoice or bank transfer). */
export async function recordManualPackage(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const pkg = await getPackage(Number(formData.get("packageId")));
  if (!pkg) return { errors: { packageId: "Choose a package." } };
  const [client] = await getDb().select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return { ok: false, message: "Client not found." };
  const now = new Date();
  await getDb()
    .insert(clientPackages)
    .values({
      clientId,
      packageId: pkg.id,
      name: pkg.name,
      pricePence: pkg.pricePence,
      sessionCount: pkg.sessionCount,
      sessionMinutes: pkg.sessionMinutes,
      status: "paid",
      source: "manual",
      paidAt: now,
      createdAt: now,
    });
  getDb().update(clients).set({ kind: "client", updatedAt: now }).where(eq(clients.id, clientId)).run();
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePackages();
  return { ok: true, message: `${pkg.name} recorded as paid.` };
}

// — Client —

/** Starts a Stripe Checkout for a package and sends the client there. */
export async function buyPackage(packageId: number): Promise<FormState> {
  const user = await requireClient();
  const pkg = await getPackage(packageId);
  if (!pkg || !pkg.active) return { ok: false, message: "That package isn't available any more." };
  let url: string | null = null;
  try {
    url = await createPackageCheckout({ clientId: user.clientId, email: user.email, pkg });
  } catch (err) {
    console.error("Package checkout failed", err);
  }
  if (!url) return { ok: false, message: "We couldn't open the payment page. Please try again, or message Monika." };
  redirect(url);
}
