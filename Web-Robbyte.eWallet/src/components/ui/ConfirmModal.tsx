import type { ConfirmOptions } from "../../types";
import { Button, Modal } from "react-bootstrap";
import { useT } from "../../contexts";

export function ConfirmModal({
  request,
  onCancel,
  onConfirm,
}: {
  request: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useT();

  return (
    <Modal show={Boolean(request)} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{request?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{request?.message}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant={request?.variant || "danger"} onClick={onConfirm}>
          {request?.confirmLabel || t("common.confirm")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

