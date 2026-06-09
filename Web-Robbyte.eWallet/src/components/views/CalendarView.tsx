import type { AppData, PaymentDue } from "../../types";
import { Card, ListGroup } from "react-bootstrap";
import { sourceLabel, expensePriorityLabel } from "../../utils";
import { getPaymentDues } from "../../lib/calculations";
import { useMoney, useT, useLanguage } from "../../contexts";
import { ViewTitle, PaymentList, StatusBadge, EmptyState } from "../ui/SharedComponents";

export function CalendarView({ dues }: { dues: ReturnType<typeof getPaymentDues> }) {
  const money = useMoney();
  const t = useT();
  const { locale } = useLanguage();

  return (
    <section className="view-stack">
      <ViewTitle title={t("calendar.title")} subtitle={t("calendar.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <ListGroup variant="flush">
            {dues.map((due) => {
              const date = new Date(`${due.dueDate}T12:00:00`);
              return (
                <ListGroup.Item
                  className="px-0 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between"
                  key={due.id}
                >
                  <div className="d-flex align-items-center gap-3 min-w-0">
                    <div className="date-tile">
                      <strong>{date.getDate()}</strong>
                      <span>
                        {new Intl.DateTimeFormat(locale, { month: "short" }).format(date)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <strong className="d-block">{due.label}</strong>
                      <span className="text-secondary">{sourceLabel(due.source, t)}</span>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <strong>{money(due.amount)}</strong>
                    <StatusBadge status={due.status} />
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          {dues.length === 0 && <EmptyState text={t("calendar.empty")} />}
        </Card.Body>
      </Card>
    </section>
  );
}

