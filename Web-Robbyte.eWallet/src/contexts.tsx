import { createContext, useContext, useCallback } from "react";
import type { Language, TranslationKey } from "./types";
import { formatCurrency, formatDate } from "./lib/format";
import { translate } from "./lib/i18n";

export const MoneyFormatContext = createContext({
  currency: "PEN",
  locale: "es-PE",
});

export const LanguageContext = createContext({
  language: "es" as Language,
  locale: "es-PE",
  t: (key: string) => translate("es", key as any),
});

export const useMoney = () => {
  const { currency, locale } = useContext(MoneyFormatContext);
  return useCallback(
    (value: number) => formatCurrency(value, currency, locale),
    [currency, locale],
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const useT = () => useLanguage().t;

export const useDateFormatter = () => {
  const { locale } = useLanguage();
  return useCallback((date: string) => formatDate(date, locale), [locale]);
};

