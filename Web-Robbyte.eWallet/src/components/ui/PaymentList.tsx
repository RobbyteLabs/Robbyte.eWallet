import type { PaymentDue } from "../../types";
import { ListGroup} from "react-bootstrap";
import { sourceLabel } from "../../utils";
import { useDateFormatter, useMoney, useT } from "../../contexts";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function PaymentList({
  dues,
  emptyText,
  showStatus,
}: {
  dues: PaymentDue[];
  emptyText: string;
  showStatus?: boolean;
}) {
  const money = useMoney();
  const t = useT();
  const date = useDateFormatter();

  if (dues.length === 0) return <EmptyState text={emptyText} />;
  return (
    <ListGroup variant="flush">
      {dues.map((due) => (
        <ListGroup.Item
          className="px-0 d-flex flex-column flex-sm-row gap-2 justify-content-between"
          key={due.id}
        >
          <div className="min-w-0">
            <strong className="d-block">{due.label}</strong>
            <span className="text-secondary">
              {sourceLabel(due.source, t)} - {date(due.dueDate)}
            </span>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 justify-content-sm-end">
            <strong>{money(due.amount)}</strong>
            {showStatus && <StatusBadge status={due.status} />}
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}

