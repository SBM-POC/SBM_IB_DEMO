/**
 * Converts a currency string like "MUR 245,911.10" or "US$ 2.00"
 * into a plain number: 245911.10 or 2.00
 */
export function parseCurrencyToNumber(raw: string): number {
  if (!raw) return NaN;

  // Remove currency symbols (MUR, US$, Rs, etc.)
  const cleaned = raw
    .replace(/[^\d.,-]/g, '') // keep only digits, comma, dot, minus
    .replace(/,/g, '');       // strip commas

  return parseFloat(cleaned);
}
