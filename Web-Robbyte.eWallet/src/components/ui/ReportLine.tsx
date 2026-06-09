import { useMoney } from "../../contexts";

export function ReportLine({ label, value }: { label: string; value: number }) {
  const money = useMoney();

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between gap-1 border-bottom pb-2">
      <span className="text-secondary">{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}

