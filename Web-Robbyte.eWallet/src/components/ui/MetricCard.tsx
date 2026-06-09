import { Card } from "react-bootstrap";

export function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  return (
    <Card className={`stat-card h-100 shadow-sm ${accent || ""}`}>
      <Card.Body>
        <span className="text-secondary fw-semibold">{label}</span>
        <strong className="d-block mt-3">{value}</strong>
      </Card.Body>
    </Card>
  );
}

