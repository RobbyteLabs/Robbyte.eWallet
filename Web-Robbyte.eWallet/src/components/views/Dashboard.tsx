import { Button, Card, Row, Col } from "react-bootstrap";
import type { AppData } from '../../types';
import { views } from "../../utils";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { MetricCard, BudgetBar, SectionTitle, ViewTitle, ActionCard, EmptyState, PaymentList } from "../ui/SharedComponents";
import { getMonthlyReport, getPaymentDues, getUpcomingAlerts } from '../../lib/calculations';
import { getCurrencyOption } from '../../data/defaults';

export function Dashboard({
  data,
  report,
  dues,
  alerts,
}: {
  data: AppData;
  report: ReturnType<typeof getMonthlyReport>;
  dues: ReturnType<typeof getPaymentDues>;
  alerts: ReturnType<typeof getUpcomingAlerts>;
}) {
  const money = useMoney();
  const t = useT();
  const selectedCurrency = getCurrencyOption(
    data.settings.currency,
    data.settings.currencyCountry,
  );

  return (
    <section className="view-stack">
      <ViewTitle
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <Row xs={1} md={2} xl={4} className="g-3">
        <Col>
          <MetricCard label={t("dashboard.monthlyIncome")} value={money(report.income)} />
        </Col>
        <Col>
          <MetricCard label={t("dashboard.fixedExpenses")} value={money(report.fixedExpenses)} />
        </Col>
        <Col>
          <MetricCard
            label={t("dashboard.cardsAndLoans")}
            value={money(report.cardPayments + report.loanPayments)}
          />
        </Col>
        <Col>
          <MetricCard
            label={t("dashboard.realAvailable")}
            value={money(report.available)}
            accent={report.available >= 0 ? "positive" : "negative"}
          />
        </Col>
      </Row>

      <Row xs={1} lg={2} className="g-3">
        <Col>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <SectionTitle title={t("dashboard.alerts")} count={alerts.length} />
              <PaymentList
                dues={alerts}
                emptyText={t("dashboard.noAlerts")}
                showStatus
              />
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <SectionTitle
                title={t("dashboard.commitments")}
                count={dues.filter((due) => due.status !== "paid").length}
              />
              <PaymentList
                dues={dues.slice(0, 8)}
                emptyText={t("dashboard.noCommitments")}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle
            title={t("dashboard.distribution")}
            count={`${selectedCurrency.country} - ${selectedCurrency.currency}`}
          />
          <div className="d-grid gap-3">
            <BudgetBar label={t("budget.fixed")} value={report.fixedExpenses} max={report.income} />
            <BudgetBar label={t("budget.variable")} value={report.variableExpenses} max={report.income} />
            <BudgetBar label={t("budget.loans")} value={report.loanPayments} max={report.income} />
            <BudgetBar label={t("budget.cards")} value={report.cardPayments} max={report.income} />
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

