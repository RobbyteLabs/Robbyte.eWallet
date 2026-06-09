import type { AppData } from "../types";

export const defaultAppData: AppData = {
  settings: {
    currency: "PEN",
    currencyCountry: "PE",
    currencyLocale: "es-PE",
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
  "Hipoteca",
  "Servicios",
  "Luz",
  "Agua",
  "Gas",
  "Internet",
  "Celular",
  "Transporte",
  "Combustible",
  "Alimentacion",
  "Supermercado",
  "Restaurantes",
  "Salud",
  "Medicinas",
  "Seguro",
  "Educacion",
  "Mascotas",
  "Ropa",
  "Hogar",
  "Prestamo",
  "Tarjeta",
  "Ahorro",
  "Inversion",
  "Impuestos",
  "Donaciones",
  "Viajes",
  "Ocio",
  "Compras",
  "Streaming",
  "Otros",
];

export const incomeCategories = [
  "Ingreso base",
  "Salario",
  "Freelance",
  "Negocio",
  "Bonos",
  "Comisiones",
  "Inversiones",
  "Alquileres",
  "Reembolsos",
  "Regalos",
  "Otros",
];

export const paymentMethods = [
  "Efectivo",
  "Yape/Plin",
  "Transferencia",
  "Debito",
  "Credito",
  "Billetera digital",
  "Otro",
];

export const expensePriorities = [
  { value: "essential", label: "Necesario" },
  { value: "lifestyle", label: "Estilo de vida" },
  { value: "savings", label: "Ahorro/Inversion" },
  { value: "debt", label: "Deuda" },
] as const;

export const currencyOptions = [
  {
    id: "PE:PEN",
    country: "Peru",
    countryCode: "PE",
    currency: "PEN",
    currencyName: "Sol peruano",
    locale: "es-PE",
  },
  {
    id: "US:USD",
    country: "Estados Unidos",
    countryCode: "US",
    currency: "USD",
    currencyName: "Dolar estadounidense",
    locale: "en-US",
  },
  {
    id: "EC:USD",
    country: "Ecuador",
    countryCode: "EC",
    currency: "USD",
    currencyName: "Dolar estadounidense",
    locale: "es-EC",
  },
  {
    id: "ES:EUR",
    country: "Espana",
    countryCode: "ES",
    currency: "EUR",
    currencyName: "Euro",
    locale: "es-ES",
  },
  {
    id: "MX:MXN",
    country: "Mexico",
    countryCode: "MX",
    currency: "MXN",
    currencyName: "Peso mexicano",
    locale: "es-MX",
  },
  {
    id: "CO:COP",
    country: "Colombia",
    countryCode: "CO",
    currency: "COP",
    currencyName: "Peso colombiano",
    locale: "es-CO",
  },
  {
    id: "CL:CLP",
    country: "Chile",
    countryCode: "CL",
    currency: "CLP",
    currencyName: "Peso chileno",
    locale: "es-CL",
  },
  {
    id: "AR:ARS",
    country: "Argentina",
    countryCode: "AR",
    currency: "ARS",
    currencyName: "Peso argentino",
    locale: "es-AR",
  },
  {
    id: "BO:BOB",
    country: "Bolivia",
    countryCode: "BO",
    currency: "BOB",
    currencyName: "Boliviano",
    locale: "es-BO",
  },
  {
    id: "BR:BRL",
    country: "Brasil",
    countryCode: "BR",
    currency: "BRL",
    currencyName: "Real brasileno",
    locale: "pt-BR",
  },
  {
    id: "GB:GBP",
    country: "Reino Unido",
    countryCode: "GB",
    currency: "GBP",
    currencyName: "Libra esterlina",
    locale: "en-GB",
  },
  {
    id: "CA:CAD",
    country: "Canada",
    countryCode: "CA",
    currency: "CAD",
    currencyName: "Dolar canadiense",
    locale: "en-CA",
  },
] as const;

export const getCurrencyOption = (currency = "PEN", countryCode?: string) =>
  currencyOptions.find(
    (option) =>
      option.currency === currency &&
      (!countryCode || option.countryCode === countryCode),
  ) ||
  currencyOptions.find((option) => option.currency === currency) ||
  currencyOptions[0];
