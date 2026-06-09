import type {
  AppData,
  CreditCard,
  Expense,
  ExpensePriority,
  MonthlyReport,
  PaymentDue,
} from "../types";
import { monthKey, todayIso } from "./format";

const dateFromDay = (day: number, base = new Date()) => {
  const safeDay = Math.min(Math.max(day, 1), 31);
  const date = new Date(base.getFullYear(), base.getMonth(), safeDay);
  if (date.getMonth() !== base.getMonth()) {
    date.setDate(0);
  }
  return date.toISOString().slice(0, 10);
};

export const getMonthlyCardPayment = (card: CreditCard) =>
  card.purchases.reduce((sum, purchase) => {
    const pendingInstallments = Math.max(
      purchase.installments - purchase.paidInstallments,
      0,
    );
    if (pendingInstallments === 0) return sum;
    return sum + purchase.amount / Math.max(purchase.installments, 1);
  }, 0);

export const getUsedCardLimit = (card: CreditCard) =>
  card.purchases.reduce((sum, purchase) => {
    const pendingRatio =
      Math.max(purchase.installments - purchase.paidInstallments, 0) /
      Math.max(purchase.installments, 1);
    return sum + purchase.amount * pendingRatio;
  }, 0);

const expenseDue = (expense: Expense): string => {
  if (expense.frequency === "once" && expense.date) return expense.date;
  return dateFromDay(expense.dueDay ?? 1);
};

export const getPaymentDues = (data: AppData): PaymentDue[] => {
  const today = todayIso();
  const expenseDues: PaymentDue[] = data.expenses.map((expense) => {
    const dueDate = expenseDue(expense);
    return {
      id: `expense-${expense.id}`,
      label: expense.name,
      source: "expense",
      amount: expense.amount,
      dueDate,
      status: expense.paid ? "paid" : dueDate < today ? "overdue" : "due",
    };
  });

  const loanDues: PaymentDue[] = data.loans.map((loan) => ({
    id: `loan-${loan.id}`,
    label: loan.lender,
    source: "loan",
    amount: loan.monthlyPayment,
    dueDate: loan.nextDueDate || dateFromDay(loan.dueDay),
    status: loan.paidThisMonth
      ? "paid"
      : (loan.nextDueDate || dateFromDay(loan.dueDay)) < today
        ? "overdue"
        : "due",
  }));

  const cardDues: PaymentDue[] = data.cards.map((card) => {
    const dueDate = dateFromDay(card.paymentDay);
    const payment = getMonthlyCardPayment(card);
    return {
      id: `card-${card.id}`,
      label: card.name,
      source: "card",
      amount: payment,
      dueDate,
      status:
        payment === 0
          ? "paid"
          : card.lastPaymentDate?.startsWith(monthKey())
            ? "paid"
            : dueDate < today
              ? "overdue"
              : "due",
    };
  });

  return [...expenseDues, ...loanDues, ...cardDues].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );
};

export const getMonthlyReport = (data: AppData): MonthlyReport => {
  const currentMonth = monthKey();
  const fixedExpenses = data.expenses
    .filter((expense) => expense.kind === "fixed")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const variableExpenses = data.expenses
    .filter((expense) => expense.kind === "variable")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const loanPayments = data.loans.reduce(
    (sum, loan) => sum + loan.monthlyPayment,
    0,
  );
  const cardPayments = data.cards.reduce(
    (sum, card) => sum + getMonthlyCardPayment(card),
    0,
  );
  const trackedIncome = data.incomes
    .filter(
      (income) => income.recurring || income.date.startsWith(currentMonth),
    )
    .reduce((sum, income) => sum + income.amount, 0);
  const income = data.settings.monthlyIncome + trackedIncome;

  return {
    monthKey: monthKey(),
    income,
    fixedExpenses,
    variableExpenses,
    loanPayments,
    cardPayments,
    available:
      income - fixedExpenses - variableExpenses - loanPayments - cardPayments,
  };
};

export const getUpcomingAlerts = (data: AppData) => {
  const today = new Date(`${todayIso()}T12:00:00`);
  const max = new Date(today);
  max.setDate(today.getDate() + data.settings.alertDaysBefore);

  return getPaymentDues(data).filter((due) => {
    if (due.status === "paid") return false;
    const dueDate = new Date(`${due.dueDate}T12:00:00`);
    return dueDate <= max;
  });
};

export const groupAmounts = <T>(
  items: T[],
  getKey: (item: T) => string | undefined,
  getAmount: (item: T) => number,
) =>
  items
    .reduce<Array<{ label: string; amount: number }>>((totals, item) => {
      const label = getKey(item) || "Sin clasificar";
      const current = totals.find((entry) => entry.label === label);
      if (current) {
        current.amount += getAmount(item);
      } else {
        totals.push({ label, amount: getAmount(item) });
      }
      return totals;
    }, [])
    .sort((a, b) => b.amount - a.amount);

export const getExpenseCategoryTotals = (data: AppData) =>
  groupAmounts(data.expenses, (expense) => expense.category, (expense) => expense.amount);

export const getIncomeCategoryTotals = (data: AppData) =>
  [
    ...(data.settings.monthlyIncome > 0
      ? [{ label: "Ingreso base", amount: data.settings.monthlyIncome }]
      : []),
    ...groupAmounts(data.incomes, (income) => income.category, (income) => income.amount),
  ].sort((a, b) => b.amount - a.amount);

const priorityLabels: Record<ExpensePriority, string> = {
  essential: "Necesario",
  lifestyle: "Estilo de vida",
  savings: "Ahorro/Inversion",
  debt: "Deuda",
};

export const getExpensePriorityTotals = (data: AppData) =>
  groupAmounts(
    data.expenses,
    (expense) => priorityLabels[expense.priority || "essential"],
    (expense) => expense.amount,
  );
