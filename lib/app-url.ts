import { headers } from "next/headers";

/** Absolute URL for links in emails. Prefers NEXT_PUBLIC_BASE_URL, else the request host. */
export async function appUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}${path}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
