import type { SyncState } from "../../types";
import { Badge, Spinner } from "react-bootstrap";
import { Icon } from "./Icon";
import { useDateFormatter, useLanguage, useT } from "../../contexts";

export function Header({
  sync,
}: {
  sync: SyncState;
}) {
  const t = useT();
  const { locale } = useLanguage();
  const variant =
    sync.status === "error"
      ? "danger"
      : sync.status === "offline"
        ? "warning"
        : sync.status === "saving" || sync.status === "loading"
          ? "warning"
          : "success";
  return (
    <header className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center mb-4">
      <div className="min-w-0">
        <Badge bg={variant} className="sync-badge">
          {sync.status === "saving" || sync.status === "loading" ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : (
            <Icon name="cloud-check" className="me-2" />
          )}
          {sync.message}
        </Badge>
        {sync.lastSavedAt && (
          <span className="d-block d-sm-inline ms-sm-2 mt-2 mt-sm-0 text-secondary small">
            {t("common.lastSaved")}:{" "}
            {new Date(sync.lastSavedAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </header>
  );
}

