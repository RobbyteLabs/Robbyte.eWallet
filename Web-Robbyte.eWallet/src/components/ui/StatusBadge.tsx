import { Badge } from "react-bootstrap";
import type { TranslationKey } from "../../lib/i18n";
import { useT } from "../../contexts";

export function StatusBadge({ status }: { status: "paid" | "due" | "overdue" }) {
  const t = useT();
  const labels: Record<"paid" | "due" | "overdue", TranslationKey> = {
    paid: "common.paid",
    due: "common.due",
    overdue: "common.overdue",
  };
  const variants = {
    paid: "success",
    due: "warning",
    overdue: "danger",
  };
  return <Badge bg={variants[status]}>{t(labels[status])}</Badge>;
}

