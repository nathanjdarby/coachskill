/** Formats pence as pounds, dropping ".00" for whole amounts (e.g. 2500 → "£25", 37450 → "£374.50"). */
export function formatPence(pence: number) {
  const pounds = pence / 100;
  return Number.isInteger(pounds)
    ? `£${pounds.toLocaleString("en-GB")}`
    : `£${pounds.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
