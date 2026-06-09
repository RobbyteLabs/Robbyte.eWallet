import { Card } from "react-bootstrap";
import { EmptyState } from "./EmptyState";

export function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <EmptyState text={text} />
      </Card.Body>
    </Card>
  );
}

