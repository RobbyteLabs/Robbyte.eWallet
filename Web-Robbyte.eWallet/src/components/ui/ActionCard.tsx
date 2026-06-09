import { Button, Card } from "react-bootstrap";
import { Icon } from "../layout/Icon";

export function ActionCard({
  icon,
  title,
  text,
  buttonLabel,
  variant,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  buttonLabel: string;
  variant: string;
  onClick: () => void;
}) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body className="d-grid gap-2 align-content-start">
        <Icon name={icon} className="fs-3 text-primary" />
        <Card.Title>{title}</Card.Title>
        <Card.Text className="text-secondary">{text}</Card.Text>
        <Button variant={variant} onClick={onClick}>
          <Icon name={icon} /> {buttonLabel}
        </Button>
      </Card.Body>
    </Card>
  );
}

