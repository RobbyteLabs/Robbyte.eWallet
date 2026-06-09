import { Button, Card, Form, Row, Col, ListGroup, Badge } from "react-bootstrap";
import type { AppData, Expense, ExpenseKind, ExpensePriority, Frequency, ConfirmOptions } from "../../types";
import type { FormEvent } from "react";
import { views, toStringValue, toNumber, createId } from "../../utils";
import { todayIso } from "../../lib/format";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { expenseCategories, expensePriorities, paymentMethods } from "../../data/defaults";
import { expensePriorityLabel, localizeDataLabel } from "../../utils";
import { SectionTitle, ViewTitle, EmptyState, StatusBadge } from "../ui/SharedComponents";

export function ExpensesView({
  data,
  updateData,
  confirm,
}: {
  data: AppData;
  updateData: (producer: (current: AppData) => AppData) => Promise<void>;
  confirm: (options: ConfirmOptions) => void;
}) {
  const money = useMoney();
  const t = useT();
  const { language } = useLanguage();

  const addExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
    event.currentTarget.reset();
    await updateData((current) => ({
      ...current,
      expenses: [expense, ...current.expenses],
    }));
  };

  return (
    <section className="view-stack">
      <ViewTitle title={t("expenses.title")} subtitle={t("expenses.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={addExpense}>
            <Row xs={1} md={2} xl={4} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>{t("expenses.name")}</Form.Label>
                  <Form.Control name="name" required placeholder={t("placeholder.expenseName")} />
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
              <Col xl={8}>
                <Form.Group>
                  <Form.Label>{t("expenses.notes")}</Form.Label>
                  <Form.Control name="notes" placeholder={t("placeholder.optionalDetail")} />
                </Form.Group>
              </Col>
              <Col>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="plus-lg" /> {t("expenses.add")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle title={t("expenses.records")} count={data.expenses.length} />
          <ListGroup variant="flush">
            {data.expenses.map((expense) => (
              <ListGroup.Item
                className="px-0 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between"
                key={expense.id}
              >
                <div className="min-w-0">
                  <strong className="d-block">{expense.name}</strong>
                  <span className="text-secondary">
                    {localizeDataLabel(expense.category, language)} - {expense.kind === "fixed" ? t("expenseKind.fixed") : t("expenseKind.variable")}
                  </span>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {expense.priority && (
                      <Badge bg="light" text="dark">
                        {expensePriorityLabel(expense.priority, t)}
                      </Badge>
                    )}
                    {expense.paymentMethod && (
                      <Badge bg="light" text="dark">
                        {localizeDataLabel(expense.paymentMethod, language)}
                      </Badge>
                    )}
                  </div>
                  {expense.notes && (
                    <span className="d-block text-secondary small mt-1">
                      {expense.notes}
                    </span>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-md-end">
                  <strong>{money(expense.amount)}</strong>
                  <StatusBadge status={expense.paid ? "paid" : "due"} />
                  <Button
                    variant="outline-success"
                    size="sm"
                    title={t("expenses.togglePaid")}
                    onClick={() =>
                      updateData((current) => ({
                        ...current,
                        expenses: current.expenses.map((item) =>
                          item.id === expense.id
                            ? { ...item, paid: !item.paid }
                            : item,
                        ),
                      }))
                    }
                  >
                    <Icon name="check2" />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    title={t("common.delete")}
                    onClick={() =>
                      confirm({
                        title: t("expenses.deleteTitle"),
                        message: `${t("expenses.deleteMessage")} "${expense.name}".`,
                        confirmLabel: t("common.delete"),
                        variant: "danger",
                        onConfirm: () =>
                          updateData((current) => ({
                            ...current,
                            expenses: current.expenses.filter(
                              (item) => item.id !== expense.id,
                            ),
                          })),
                      })
                    }
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
          {data.expenses.length === 0 && <EmptyState text={t("expenses.empty")} />}
        </Card.Body>
      </Card>
    </section>
  );
}

