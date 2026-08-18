/**
 * formatIndian.ts
 * Global Indian number formatting utility for PLYTRACK.
 *
 * Scale conventions:
 *   K  (Thousand)  = 1,000
 *   L  (Lakh)      = 1,00,000   (100,000)
 *   Cr (Crore)     = 1,00,00,000 (10,000,000)
 */

const CRORE    = 10_000_000;
const LAKH     = 100_000;
const THOUSAND = 1_000;

export interface FormatOptions {
  /** Force full Indian-locale format without abbreviation (e.g. ₹1,20,000). Useful for per-sheet values. */
  raw?: boolean;
  /** Number of decimal places in abbreviated form. Default: 1 */
  decimals?: number;
  /** Include ₹ prefix. Default: true */
  currency?: boolean;
}

export function formatINR(
  value: number | null | undefined,
  options: FormatOptions = {}
): string {
  const { raw = false, decimals = 1, currency = true } = options;
  const prefix = currency ? "₹" : "";

  if (value === null || value === undefined || isNaN(value)) return `${prefix}0`;

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (raw || abs < THOUSAND) {
    const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return `${sign}${prefix}${formatted}`;
  }
  if (abs >= CRORE) {
    const n = (abs / CRORE).toFixed(decimals).replace(/\.0$/, "");
    return `${sign}${prefix}${n}Cr`;
  }
  if (abs >= LAKH) {
    const n = (abs / LAKH).toFixed(decimals).replace(/\.0$/, "");
    return `${sign}${prefix}${n}L`;
  }
  const n = (abs / THOUSAND).toFixed(decimals).replace(/\.0$/, "");
  return `${sign}${prefix}${n}K`;
}

export function formatNumber(
  value: number | null | undefined,
  options: Omit<FormatOptions, "currency"> = {}
): string {
  return formatINR(value, { ...options, currency: false });
}

export function formatPerUnit(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || isNaN(value)) return "₹0" + suffix;
  return "₹" + value.toFixed(2) + suffix;
}

export function formatVariance(
  value: number | null | undefined,
  options: FormatOptions = {}
): string {
  if (value === null || value === undefined || isNaN(value)) return "₹0";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatINR(value, options)}`;
}
