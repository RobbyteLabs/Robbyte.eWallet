import { Spinner } from "react-bootstrap";
import { Card } from "react-bootstrap";

export function CenteredStatus({ label }: { label: string }) {
  return (
    <main className="auth-screen">
      <Card className="auth-card text-center shadow border-0">
        <Card.Body className="p-4">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="mb-0">{label}</p>
        </Card.Body>
      </Card>
    </main>
  );
}
