import type { AppData } from "../types";

export const defaultAppData: AppData = {
  settings: {
    currency: "PEN",
    monthlyIncome: 0,
    alertDaysBefore: 5,
  },
  incomes: [],
  expenses: [],
  loans: [],
  cards: [],
};

export const expenseCategories = [
  "Alquiler",
  "Servicios",
  "Transporte",
  "Alimentacion",
  "Prestamo",
  "Tarjeta",
  "Ahorro",
  "Ocio",
  "Compras",
  "Streaming",
  "Otros",
];
