import { Toast, ToastContainer } from "react-bootstrap";
// AppToast defined inline for ToastLayer
interface AppToast {
  id: string;
  tone: "success" | "danger" | "warning" | "info";
  title: string;
  message: string;
}

export function ToastLayer({
  toasts,
  onClose,
}: {
  toasts: AppToast[];
  onClose: (id: string) => void;
}) {
  return (
    <ToastContainer position="top-end" className="position-fixed p-3 app-toast-layer">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          bg={toast.tone}
          delay={4500}
          autohide
          onClose={() => onClose(toast.id)}
        >
          <Toast.Header>
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body className={toast.tone === "warning" ? "" : "text-white"}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
