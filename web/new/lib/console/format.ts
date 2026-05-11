export type DisplayContext = {
  siteCreditsPerPriceUnit?: number;
  currencySymbol?: string;
  quotaDisplayType?: string;
};

const DEFAULT_CREDITS_PER_UNIT = 1_000_000;

export function creditsToMoney(
  credits: unknown,
  context: DisplayContext = {},
): number {
  const value = toNumber(credits);
  const divisor = context.siteCreditsPerPriceUnit || DEFAULT_CREDITS_PER_UNIT;
  return value / divisor;
}

export function moneyToCredits(
  amount: unknown,
  context: DisplayContext = {},
): number {
  const multiplier =
    context.siteCreditsPerPriceUnit || DEFAULT_CREDITS_PER_UNIT;
  return Math.round(toNumber(amount) * multiplier);
}

export function fmtMoney(value: unknown, context: DisplayContext = {}): string {
  const amount = toNumber(value);
  const symbol = context.currencySymbol || "$";
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount >= 100 ? 2 : 4,
    maximumFractionDigits: amount >= 100 ? 2 : 4,
  })}`;
}

export function fmtNum(value: unknown): string {
  return toNumber(value).toLocaleString("en-US");
}

export function fmtRelative(value: unknown): string {
  const timestamp = toDate(value)?.getTime();
  if (!timestamp) return "never";
  const diff = Date.now() - timestamp;
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [86_400_000 * 30, "month"],
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "minute"],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unitMs, unit] of units) {
    if (abs >= unitMs) {
      return formatter.format(Math.round(-diff / unitMs), unit);
    }
  }
  return "just now";
}

export function fmtAbsDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "never";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 10_000_000_000 ? value : value * 1000);
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && /^\d+$/.test(value)) return toDate(numeric);
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return (parts || name.slice(0, 2) || "U").slice(0, 2).toUpperCase();
}
