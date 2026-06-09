import { Alert } from "react-bootstrap";

export function EmptyState({ text }: { text: string }) {
  return <Alert variant="light" className="border mb-0 text-secondary">{text}</Alert>;
}

