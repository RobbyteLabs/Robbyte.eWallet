import { getCurrencyOption } from "../data/defaults";

export const formatCurrency = (
  value: number,
  currency = "PEN",
  locale?: string,
) => {
  const option = getCurrencyOption(currency);
  try {
    return new Intl.NumberFormat(locale || option.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${currency} ${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
  }
};

export const formatDate = (date: string, locale = "es-PE") =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);
