import type { FormEvent } from "react";
import { useState } from "react";
import { Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";

import { expenseCategories, expensePriorities, incomeCategories, paymentMethods } from "../../data/defaults";
import { todayIso } from "../../lib/format";
import type {
  AppData,
  Expense,
  ExpenseKind,
  ExpensePriority,
  Frequency,
  Income,
  SyncState,
} from "../../types";
import {
  createId,
  expensePriorityLabel,
  localizeDataLabel,
  toNumber,
  toStringValue,
} from "../../utils";
import { useLanguage, useT } from "../../contexts";
import { Icon } from "./Icon";

type FloatingDialog = "expense" | "income" | null;

interface FloatingActionsProps {
  sync: SyncState;
  onSync: () => Promise<void>;
  updateData: (producer: (current: AppData) => AppData) => Promise<void>;
}

export function FloatingActions({
  sync,
  onSync,
  updateData,
}: FloatingActionsProps) {
  const [dialog, setDialog] = useState<FloatingDialog>(null);
  const t = useT();
  const { language } = useLanguage();
  const isSyncing = sync.status === "saving" || sync.status === "loading";

  const closeDialog = () => setDialog(null);

  const handleSync = () => {
    if (isSyncing) return;
    void onSync();
  };

  const addExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const frequency = toStringValue(form.get("frequency")) as Frequency;
    const kind = toStringValue(form.get("kind")) as ExpenseKind;
    const priority = toStringValue(form.get("priority")) as ExpensePriority;
    const expense: Expense = {
      id: createId("expense"),
      name: toStringValue(form.get("name")),
      amount: toNumber(form.get("amount")),
      category: toStringValue(form.get("category")),
      kind,
      priority,
      paymentMethod: toStringValue(form.get("paymentMethod")),
      notes: toStringValue(form.get("notes")),
      dueDay: frequency === "monthly" ? toNumber(form.get("dueDay")) : undefined,
      date: frequency === "once" ? toStringValue(form.get("date")) : undefined,
      paid: false,
      frequency,
    };

    await updateData((current) => ({
      ...current,
      expenses: [expense, ...current.expenses],
    }));
    formElement.reset();
    closeDialog();
  };

  const addIncome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const income: Income = {
      id: createId("income"),
      source: toStringValue(form.get("source")),
      amount: toNumber(form.get("amount")),
      date: toStringValue(form.get("date")),
      recurring: form.get("recurring") === "on",
      category: toStringValue(form.get("category")),
      notes: toStringValue(form.get("notes")),
    };

    await updateData((current) => ({
      ...current,
      incomes: [income, ...current.incomes],
    }));
    formElement.reset();
    closeDialog();
  };

  return (
    <>
      <div className="floating-actions" role="group" aria-label={t("quickActions.label")}>
        <Button
          type="button"
          variant="primary"
          className="floating-action-btn"
          aria-label={t("quickActions.syncNow")}
          title={t("quickActions.syncNow")}
          disabled={isSyncing}
          onClick={handleSync}
        >
          {isSyncing ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <Icon name="arrow-repeat" />
          )}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="floating-action-btn"
          aria-label={t("quickActions.addExpense")}
          title={t("quickActions.addExpense")}
          onClick={() => setDialog("expense")}
        >
          <Icon name="wallet2" />
        </Button>
        <Button
          type="button"
          variant="success"
          className="floating-action-btn"
          aria-label={t("quickActions.addIncome")}
          title={t("quickActions.addIncome")}
          onClick={() => setDialog("income")}
        >
          <Icon name="cash-stack" />
        </Button>
      </div>

      <Modal show={dialog === "expense"} onHide={closeDialog} centered>
        <Form onSubmit={addExpense}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{t("quickActions.newExpense")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row xs={1} md={2} className="g-3">
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.name")}</Form.Label>
                  <Form.Control
                    name="name"
                    required
                    placeholder={t("placeholder.expenseName")}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.amount")}</Form.Label>
                  <Form.Control name="amount" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.category")}</Form.Label>
                  <Form.Select name="category" defaultValue="Servicios">
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {localizeDataLabel(category, language)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.scope")}</Form.Label>
                  <Form.Select name="priority" defaultValue="essential">
                    {expensePriorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {expensePriorityLabel(priority.value, t)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.paymentMethod")}</Form.Label>
                  <Form.Select name="paymentMethod" defaultValue="Transferencia">
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {localizeDataLabel(method, language)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.type")}</Form.Label>
                  <Form.Select name="kind" defaultValue="fixed">
                    <option value="fixed">{t("expenseKind.fixed")}</option>
                    <option value="variable">{t("expenseKind.variable")}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.frequency")}</Form.Label>
                  <Form.Select name="frequency" defaultValue="monthly">
                    <option value="monthly">{t("frequency.monthly")}</option>
                    <option value="once">{t("frequency.once")}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.dueDay")}</Form.Label>
                  <Form.Control name="dueDay" min="1" max="31" type="number" defaultValue="15" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.onceDate")}</Form.Label>
                  <Form.Control name="date" type="date" defaultValue={todayIso()} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>{t("expenses.notes")}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    placeholder={t("placeholder.optionalDetail")}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary">
              <Icon name="plus-lg" /> {t("expenses.add")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={dialog === "income"} onHide={closeDialog} centered>
        <Form onSubmit={addIncome}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{t("quickActions.newIncome")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row xs={1} md={2} className="g-3">
              <Col>
                <Form.Group>
                  <Form.Label>{t("incomes.source")}</Form.Label>
                  <Form.Control
                    name="source"
                    required
                    placeholder={t("incomes.sourcePlaceholder")}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.amount")}</Form.Label>
                  <Form.Control name="amount" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("incomes.category")}</Form.Label>
                  <Form.Select name="category" defaultValue="Salario">
                    {incomeCategories.map((category) => (
                      <option key={category} value={category}>
                        {localizeDataLabel(category, language)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("incomes.date")}</Form.Label>
                  <Form.Control name="date" required type="date" defaultValue={todayIso()} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>{t("incomes.notes")}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    placeholder={t("incomes.notesPlaceholder")}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check name="recurring" type="checkbox" label={t("common.recurring")} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary">
              <Icon name="plus-lg" /> {t("incomes.add")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
