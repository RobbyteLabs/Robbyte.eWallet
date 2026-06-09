import type { AppView } from "../../types";
import { views } from "../../utils";
import { Nav } from "react-bootstrap";
import { Icon } from "./Icon";
import { useT } from "../../contexts";
import { Button } from "react-bootstrap";

export function DesktopSidebar({
  view,
  onSelect,
  onLogout,
}: {
  view: AppView;
  onSelect: (view: AppView) => void;
  onLogout: () => void;
}) {
  const t = useT();
  return (
    <aside className="app-sidebar d-none d-lg-flex">
      <div className="app-sidebar-brand">
        <div className="brand-mark">
          <Icon name="piggy-bank" />
        </div>
        <div className="min-w-0">
          <strong className="d-block text-white">Robbyte eWallet</strong>
          <span className="text-white-50 small">{t("app.personalFinance")}</span>
        </div>
      </div>
      <Nav className="app-sidebar-nav">
        {views.map((item) => (
          <Button
            key={item.id}
            variant="link"
            className={`app-sidebar-link ${item.id === view ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <Icon name={item.icon} /> {t(item.labelKey)}
          </Button>
        ))}
      </Nav>
      <div className="app-sidebar-footer">
        <Button
          variant="link"
          className="app-sidebar-link app-sidebar-logout"
          onClick={onLogout}
        >
          <Icon name="box-arrow-right" /> {t("common.logout")}
        </Button>
      </div>
    </aside>
  );
}

