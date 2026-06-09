import type { AppView } from "../../types";
import { views } from "../../utils";
import { Button, Navbar, Nav, Offcanvas } from "react-bootstrap";
import { Icon } from "./Icon";
import { useT } from "../../contexts";
import { Container } from "react-bootstrap";

export function MobileNavbar({
  view,
  open,
  onToggle,
  onSelect,
  onLogout,
}: {
  view: AppView;
  open: boolean;
  onToggle: (open: boolean) => void;
  onSelect: (view: AppView) => void;
  onLogout: () => void;
}) {
  const t = useT();
  const current = views.find((item) => item.id === view);
  return (
    <Navbar bg="dark" variant="dark" className="app-mobile-nav d-lg-none shadow-sm">
      <Container fluid className="gap-2 flex-nowrap">
        <Navbar.Brand className="app-mobile-brand">
          <span className="mobile-brand-mark">
            <Icon name="piggy-bank" />
          </span>
          <span className="mobile-brand-copy">
            <strong>Robbyte eWallet</strong>
            <small>{t("app.personalFinance")}</small>
          </span>
        </Navbar.Brand>
        <div className="app-mobile-current d-none d-sm-flex">
          <Icon name={current?.icon || "speedometer2"} />
          <span>{current ? t(current.labelKey) : ""}</span>
        </div>
        <Button
          variant="outline-light"
          className="app-menu-toggle"
          aria-label={t("common.openSections")}
          onClick={() => onToggle(true)}
        >
          <Icon name="list" className="fs-4" />
          <span className="d-none d-sm-inline">{t("common.menu")}</span>
        </Button>
        <Offcanvas
          show={open}
          onHide={() => onToggle(false)}
          placement="end"
          className="app-offcanvas"
        >
          <Offcanvas.Header closeButton closeVariant="white" className="app-offcanvas-header">
            <Offcanvas.Title className="d-flex align-items-center gap-2">
              <span className="mobile-brand-mark">
                <Icon name="piggy-bank" />
              </span>
              {t("common.sections")}
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="app-offcanvas-body">
            <Nav className="app-offcanvas-nav">
              {views.map((item) => (
                <Button
                  key={item.id}
                  variant="link"
                  className={`app-offcanvas-link ${item.id === view ? "active" : ""}`}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon name={item.icon} /> {t(item.labelKey)}
                </Button>
              ))}
            </Nav>
            <div className="app-offcanvas-footer">
              <Button
                variant="link"
                className="app-offcanvas-link app-offcanvas-logout"
                onClick={onLogout}
              >
                <Icon name="box-arrow-right" /> {t("common.logout")}
              </Button>
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </Navbar>
  );
}

