export const formatCurrency = (value: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);
