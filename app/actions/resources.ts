"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { resources, resourceShares } from "@/lib/db/schema";
import { emailNewResource } from "@/lib/email";
import { parseShare } from "@/lib/resource-shares";
import { getResource, recipientsFor } from "@/lib/resources";
import { deleteUpload } from "@/lib/uploads";
import type { FormState } from "./types";

function revalidateResources() {
  revalidatePath("/admin/resources");
  revalidatePath("/portal/resources");
}

/** Deletes a resource, who it's shared with, and its stored file. */
export async function deleteResource(id: number) {
  await requireAdmin();
  const resource = await getResource(id);
  if (!resource) return;
  const db = getDb();
  db.transaction(() => {
    db.delete(resourceShares).where(eq(resourceShares.resourceId, id)).run();
    db.delete(resources).where(eq(resources.id, id)).run();
  });
  if (resource.storageKey) await deleteUpload(resource.storageKey);
  revalidateResources();
}

export async function addResourceShare(resourceId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const resource = await getResource(resourceId);
  if (!resource) return { ok: false, message: "Resource not found." };
  const share = await parseShare(formData);
  if ("error" in share) return { errors: { scope: share.error } };
  getDb().insert(resourceShares).values({ resourceId, ...share }).run();

  if (formData.get("notify") === "on") {
    const [people, link] = await Promise.all([recipientsFor(share), appUrl("/portal/resources")]);
    after(async () => {
      for (const p of people) await emailNewResource({ to: p.email, name: p.name, title: resource.title, url: link });
    });
  }
  revalidateResources();
  return { ok: true, message: "Shared." };
}

export async function removeResourceShare(shareId: number) {
  await requireAdmin();
  getDb().delete(resourceShares).where(eq(resourceShares.id, shareId)).run();
  revalidateResources();
}
