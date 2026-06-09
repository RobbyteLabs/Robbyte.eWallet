import { Badge } from "react-bootstrap";

export function SectionTitle({
  title,
  count,
}: {
  title: string;
  count: number | string;
}) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
      <h2 className="h5 mb-0">{title}</h2>
      <Badge bg="secondary">{count}</Badge>
    </div>
  );
}

