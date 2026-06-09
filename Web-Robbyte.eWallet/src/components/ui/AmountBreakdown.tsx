import { ProgressBar } from "react-bootstrap";
import { useLanguage, useMoney } from "../../contexts";
import { Card } from "react-bootstrap";
import { SectionTitle, EmptyState } from "./SharedComponents";
import { localizeDataLabel } from "../../lib/i18n";

export function AmountBreakdown({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ label: string; amount: number }>;
  emptyText: string;
}) {
  const money = useMoney();
  const { language } = useLanguage();
  const max = Math.max(...items.map((item) => item.amount), 0);
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <SectionTitle title={title} count={items.length} />
        {items.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <div className="d-grid gap-3">
            {items.map((item) => (
              <div key={item.label}>
                <div className="d-flex justify-content-between gap-3 mb-1">
                  <span className="text-secondary">
                    {localizeDataLabel(item.label, language)}
                  </span>
                  <strong>{money(item.amount)}</strong>
                </div>
                <ProgressBar now={max > 0 ? (item.amount / max) * 100 : 0} />
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

