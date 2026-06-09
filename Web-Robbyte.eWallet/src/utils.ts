import type { EncryptedAppBlocks } from "./lib/storage";
import type { AppView, SyncState, TranslationKey, ExpensePriority, PaymentDue } from './types';
import { orderedBlocks } from './lib/crypto';

export const views: Array<{ id: AppView; labelKey: TranslationKey; icon: string }> = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: "speedometer2" },
  { id: "expenses", labelKey: "nav.expenses", icon: "wallet2" },
  { id: "loans", labelKey: "nav.loans", icon: "bank" },
  { id: "cards", labelKey: "nav.cards", icon: "credit-card" },
  { id: "calendar", labelKey: "nav.calendar", icon: "calendar-event" },
  { id: "reports", labelKey: "nav.reports", icon: "file-earmark-bar-graph" },
  { id: "backup", labelKey: "nav.backup", icon: "download" },
  { id: "settings", labelKey: "nav.settings", icon: "gear" },
];

export const initialSync: SyncState = {
  status: "idle",
  message: "Esperando desbloqueo seguro",
};

export const readFirstSalt = (blocks: EncryptedAppBlocks) => {
  for (const name of orderedBlocks) {
    if (blocks[name]?.salt) return blocks[name]?.salt;
  }
  return undefined;
};

export const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);
export const toStringValue = (value: FormDataEntryValue | null) => String(value || "");

export const getErrorCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";

export const authErrorMessage = (
  error: unknown,
  t: (key: TranslationKey) => string,
) => {
  const code = getErrorCode(error);
  if (code === "auth/unauthorized-domain") return t("auth.domainError");
  if (code === "auth/operation-not-allowed") return t("auth.providerError");
  if (code === "auth/popup-blocked") return t("auth.popupBlocked");
  if (code === "auth/popup-closed-by-user") return t("auth.popupClosed");
  return error instanceof Error ? error.message : t("auth.loginError");
};

export function expensePriorityLabel(
  priority: ExpensePriority,
  t: (key: TranslationKey) => string,
) {
  const labels: Record<ExpensePriority, TranslationKey> = {
    essential: "priority.essential",
    lifestyle: "priority.lifestyle",
    savings: "priority.savings",
    debt: "priority.debt",
  };
  return labels[priority] ? t(labels[priority]) : t("common.noScope");
}

export function sourceLabel(
  source: PaymentDue["source"],
  t: (key: TranslationKey) => string,
) {
  const labels: Record<PaymentDue["source"], TranslationKey> = {
    expense: "source.expense",
    loan: "source.loan",
    card: "source.card",
  };
  return t(labels[source]);
}


export { encryptedBackupName } from './lib/crypto';
export { createId } from './lib/ids';
export { getCurrencyOption } from './data/defaults';
export { getLanguageOption } from './lib/i18n';

export { localizeDataLabel } from './lib/i18n';
