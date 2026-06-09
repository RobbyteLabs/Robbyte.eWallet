import { Button, Row, Col } from "react-bootstrap";
import type { EncryptedAppBlocks } from "../../lib/storage";
import { views } from "../../utils";
import { Icon } from "../layout/Icon";
import { useT } from "../../contexts";
import { ActionCard, EmptyCard, ViewTitle } from "../ui/SharedComponents";

export function BackupView({
  onExport,
  onImportClick,
  onClearCache,
}: {
  onExport: () => void;
  onImportClick: () => void;
  onClearCache: () => void;
}) {
  const t = useT();

  return (
    <section className="view-stack">
      <ViewTitle
        title={t("backup.title")}
        subtitle={t("backup.subtitle")}
      />
      <Row xs={1} md={3} className="g-3">
        <Col>
          <ActionCard
            icon="download"
            title={t("backup.exportTitle")}
            text={t("backup.exportText")}
            buttonLabel={t("common.export")}
            variant="primary"
            onClick={onExport}
          />
        </Col>
        <Col>
          <ActionCard
            icon="upload"
            title={t("backup.importTitle")}
            text={t("backup.importText")}
            buttonLabel={t("common.import")}
            variant="outline-primary"
            onClick={onImportClick}
          />
        </Col>
        <Col>
          <ActionCard
            icon="trash"
            title={t("backup.clearTitle")}
            text={t("backup.clearText")}
            buttonLabel={t("common.clear")}
            variant="outline-danger"
            onClick={onClearCache}
          />
        </Col>
      </Row>
    </section>
  );
}

