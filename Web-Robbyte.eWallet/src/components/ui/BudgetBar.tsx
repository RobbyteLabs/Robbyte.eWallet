import { ProgressBar } from "react-bootstrap";
import { useMoney } from "../../contexts";

export function BudgetBar({ label, value, max }: { label: string; value: number; max: number }) {
  const money = useMoney();
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="d-flex justify-content-between gap-3 mb-1">
        <span className="text-secondary">{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <ProgressBar now={width} />
    </div>
  );
}

