import { Button, Card, Form, Row, Col, Badge } from "react-bootstrap";
import type { AppData, Loan, ConfirmOptions } from "../../types";
import type { FormEvent } from "react";
import { views, toStringValue, toNumber, createId } from "../../utils";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useMoney, useT } from "../../contexts";
import { todayIso } from "../../lib/format";
import { SectionTitle, ViewTitle, EmptyState, StatusBadge } from "../ui/SharedComponents";
import { StatPair, EmptyCard } from "../ui/SharedComponents";

export function LoansView({
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

  const addLoan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loan: Loan = {
      id: createId("loan"),
      lender: toStringValue(form.get("lender")),
      principal: toNumber(form.get("principal")),
      balance: toNumber(form.get("balance")),
      monthlyPayment: toNumber(form.get("monthlyPayment")),
      dueDay: toNumber(form.get("dueDay")),
      nextDueDate: toStringValue(form.get("nextDueDate")),
      paidThisMonth: false,
    };
    event.currentTarget.reset();
    await updateData((current) => ({
      ...current,
      loans: [loan, ...current.loans],
    }));
  };

  return (
    <section className="view-stack">
      <ViewTitle title={t("loans.title")} subtitle={t("loans.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={addLoan}>
            <Row xs={1} md={2} xl={3} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.entity")}</Form.Label>
                  <Form.Control name="lender" required placeholder={t("placeholder.loanEntity")} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.principal")}</Form.Label>
                  <Form.Control name="principal" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.balance")}</Form.Label>
                  <Form.Control name="balance" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.monthlyPayment")}</Form.Label>
                  <Form.Control name="monthlyPayment" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.paymentDay")}</Form.Label>
                  <Form.Control name="dueDay" required min="1" max="31" type="number" defaultValue="20" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("loans.nextDue")}</Form.Label>
                  <Form.Control name="nextDueDate" required type="date" defaultValue={todayIso()} />
                </Form.Group>
              </Col>
              <Col xl={3}>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="plus-lg" /> {t("loans.add")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Row xs={1} md={2} xl={3} className="g-3">
        {data.loans.map((loan) => (
          <Col key={loan.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between gap-3 mb-3">
                  <Card.Title className="mb-0 text-break">{loan.lender}</Card.Title>
                  <StatusBadge status={loan.paidThisMonth ? "paid" : "due"} />
                </div>
                <StatPair label={t("loans.balance")} value={money(loan.balance)} />
                <StatPair label={t("loans.monthlyPayment")} value={money(loan.monthlyPayment)} />
                <StatPair label={t("loans.due")} value={date(loan.nextDueDate)} />
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline-success"
                    onClick={() =>
                      updateData((current) => ({
                        ...current,
                        loans: current.loans.map((item) =>
                          item.id === loan.id
                            ? {
                                ...item,
                                paidThisMonth: !item.paidThisMonth,
                                balance: item.paidThisMonth
                                  ? item.balance + item.monthlyPayment
                                  : Math.max(item.balance - item.monthlyPayment, 0),
                              }
                            : item,
                        ),
                      }))
                    }
                  >
                    <Icon name="check2" /> {t("loans.markPaid")}
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() =>
                      confirm({
                        title: t("loans.deleteTitle"),
                        message: `${t("delete.withName")} "${loan.lender}".`,
                        confirmLabel: t("common.delete"),
                        variant: "danger",
                        onConfirm: () =>
                          updateData((current) => ({
                            ...current,
                            loans: current.loans.filter((item) => item.id !== loan.id),
                          })),
                      })
                    }
                  >
                    <Icon name="trash" /> {t("common.delete")}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {data.loans.length === 0 && (
          <Col>
            <EmptyCard text={t("loans.empty")} />
          </Col>
        )}
      </Row>
    </section>
  );
}

