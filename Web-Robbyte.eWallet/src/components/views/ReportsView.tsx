import { Card, Row, Col } from "react-bootstrap";
import type { AppData, MonthlyReport, ExpenseCategoryTotal,
  ExpensePriority } from "../../types";
import { useMoney, useT } from "../../contexts";
import { SectionTitle, ReportLine, StatPair, EmptyCard, ViewTitle, MetricCard, AmountBreakdown } from "../ui/SharedComponents";
import { getExpenseCategoryTotals, getExpensePriorityTotals, getIncomeCategoryTotals, getMonthlyReport  } from "../../lib/calculations";
import { expensePriorityLabel } from "../../utils";

export function ReportsView({
  data,
  report,
}: {
  data: AppData;
  report: ReturnType<typeof getMonthlyReport>;
}) {
  const money = useMoney();
  const t = useT();
  const expenseCategoryTotals = getExpenseCategoryTotals(data);
  const expensePriorityTotals = getExpensePriorityTotals(data).map((item) => ({
    ...item,
    label: expensePriorityLabel(item.label as ExpensePriority, t),
  }));
  const incomeCategoryTotals = getIncomeCategoryTotals(data);

  return (
    <section className="view-stack">
      <ViewTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />
      <Row xs={1} md={2} xl={4} className="g-3">
        <Col>
          <MetricCard label={t("reports.month")} value={report.monthKey} />
        </Col>
        <Col>
          <MetricCard label={t("reports.income")} value={money(report.income)} />
        </Col>
        <Col>
          <MetricCard
            label={t("reports.totalCommitted")}
            value={money(
              report.fixedExpenses +
                report.variableExpenses +
                report.loanPayments +
                report.cardPayments,
            )}
          />
        </Col>
        <Col>
          <MetricCard label={t("reports.available")} value={money(report.available)} />
        </Col>
      </Row>
      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle
            title={t("reports.detail")}
            count={`${data.expenses.length + data.loans.length + data.cards.length} ${t("common.sources")}`}
          />
          <div className="d-grid gap-2">
            <ReportLine label={t("reports.fixedExpenses")} value={report.fixedExpenses} />
            <ReportLine label={t("reports.variableExpenses")} value={report.variableExpenses} />
            <ReportLine label={t("reports.loanPayments")} value={report.loanPayments} />
            <ReportLine label={t("reports.creditCards")} value={report.cardPayments} />
          </div>
        </Card.Body>
      </Card>
      <Row xs={1} lg={3} className="g-3">
        <Col>
          <AmountBreakdown
            title={t("reports.expenseByCategory")}
            items={expenseCategoryTotals}
            emptyText={t("reports.noExpenseCategories")}
          />
        </Col>
        <Col>
          <AmountBreakdown
            title={t("reports.expenseByScope")}
            items={expensePriorityTotals}
            emptyText={t("reports.noScopes")}
          />
        </Col>
        <Col>
          <AmountBreakdown
            title={t("reports.incomeByCategory")}
            items={incomeCategoryTotals}
            emptyText={t("reports.noIncomeCategories")}
          />
        </Col>
      </Row>
    </section>
  );
}

