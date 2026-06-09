import { useState } from "react";
import type { User } from "firebase/auth";
import { Alert, Button, Form } from "react-bootstrap";
import { views, authErrorMessage } from "../../utils";
import { Icon } from "./Icon";
import { useT } from "../../contexts";
import type { ReactNode } from "react";
import { Card } from "react-bootstrap";

export function AuthShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName?: string;
}) {
  const t = useT();
  return (
    <main className="auth-screen">
      <Card className="auth-card shadow-lg border-0">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="brand-mark">
              <Icon name="piggy-bank" />
            </div>
            <div className="min-w-0">
              <strong className="d-block fs-5">Robbyte eWallet</strong>
              <span className="text-secondary">
                {userName ? `${t("auth.session")}: ${userName}` : t("auth.vault")}
              </span>
            </div>
          </div>
          <Alert variant="primary" className="d-flex gap-3 align-items-start">
            <Icon name="cash-coin" className="fs-2" />
            <div>
              <strong className="d-block">{t("auth.encryptionTitle")}</strong>
              <span>{t("auth.encryptionText")}</span>
            </div>
          </Alert>
          {children}
        </Card.Body>
      </Card>
    </main>
  );
}

