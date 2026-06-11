import { Button, Card, Form, Row, Col, ListGroup } from "react-bootstrap";
import type { AppData, ConfirmOptions, Income } from "../../types";
import type { FormEvent } from "react";
import { toStringValue, toNumber, createId } from "../../utils";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { todayIso } from "../../lib/format";
import { incomeCategories } from "../../data/defaults";
import { localizeDataLabel } from "../../lib/i18n";
import { SectionTitle, ViewTitle, EmptyState } from "../ui/SharedComponents";

export function IncomesView({
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
  const date = useDateFormatter();
  const { language } = useLanguage();

  const addIncome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const income: Income = {
      id: createId("income"),
      source: toStringValue(form.get("source")),
      amount: toNumber(form.get("amount")),
      date: toStringValue(form.get("date")),
      recurring: form.get("recurring") === "on",
      category: toStringValue(form.get("category")),
      notes: toStringValue(form.get("notes")),
    };
    event.currentTarget.reset();
    await updateData((current) => ({
      ...current,
      incomes: [income, ...current.incomes],
    }));
  };

  return (
    <section className="view-stack">
      <ViewTitle title={t("incomes.title")} subtitle={t("incomes.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={addIncome}>
            <Row xs={1} md={2} xl={5} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>{t("incomes.source")}</Form.Label>
                  <Form.Control name="source" required placeholder={t("incomes.sourcePlaceholder")} />
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
              <Col xl={2}>
                <Form.Group>
                  <Form.Label>{t("incomes.notes")}</Form.Label>
                  <Form.Control name="notes" placeholder={t("incomes.notesPlaceholder")} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Check name="recurring" type="checkbox" label={t("common.recurring")} />
              </Col>
              <Col>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="plus-lg" /> {t("incomes.add")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle title={t("incomes.incomes")} count={data.incomes.length} />
          <ListGroup variant="flush">
            {data.incomes.map((income) => (
              <ListGroup.Item
                className="px-0 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between"
                key={income.id}
              >
                <div className="min-w-0">
                  <strong className="d-block">{income.source}</strong>
                  <span className="text-secondary">
                    {income.category
                      ? localizeDataLabel(income.category, language)
                      : t("common.noCategory")} -{" "}
                    {income.recurring ? t("common.recurring") : date(income.date)}
                  </span>
                  {income.notes && (
                    <span className="d-block text-secondary small">{income.notes}</span>
                  )}
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <strong>{money(income.amount)}</strong>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    title={t("incomes.deleteTitle")}
                    onClick={() =>
                      confirm({
                        title: t("incomes.deleteTitle"),
                        message: `${t("incomes.deleteMessage")} "${income.source}".`,
                        confirmLabel: t("common.delete"),
                        variant: "danger",
                        onConfirm: () =>
                          updateData((current) => ({
                            ...current,
                            incomes: current.incomes.filter((item) => item.id !== income.id),
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
          {data.incomes.length === 0 && <EmptyState text={t("incomes.noIncomes")} />}
        </Card.Body>
      </Card>
    </section>
  );
}
