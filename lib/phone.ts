// Phone numbers typed by people (UK or international). Used in forms and emails.

/** Tidies a typed number, or null if it doesn't look like one (7–15 digits, optional +). */
export function normalisePhone(raw: string | null | undefined) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return trimmed.replace(/\s+/g, " ");
}

/** A tap-to-call link. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
