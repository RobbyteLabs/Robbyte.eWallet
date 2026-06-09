import { Button, Card, Form, Row, Col, ProgressBar, ListGroup } from "react-bootstrap";
import type { AppData, ConfirmOptions, CreditCard, CardPurchase } from "../../types";
import type { FormEvent } from "react";
import { views, toStringValue, toNumber, createId } from "../../utils";
import { expenseCategories } from "../../data/defaults";
import { localizeDataLabel } from "../../lib/i18n";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { getUsedCardLimit, getMonthlyCardPayment } from '../../lib/calculations';
import { todayIso } from "../../lib/format";
import { SectionTitle, ViewTitle, ActionCard, EmptyState, AmountBreakdown, StatPair, EmptyCard } from "../ui/SharedComponents";

export function CardsView({
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

  const addCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const card: CreditCard = {
      id: createId("card"),
      name: toStringValue(form.get("name")),
      limit: toNumber(form.get("limit")),
      closingDay: toNumber(form.get("closingDay")),
      paymentDay: toNumber(form.get("paymentDay")),
      purchases: [],
    };
    event.currentTarget.reset();
    await updateData((current) => ({ ...current, cards: [card, ...current.cards] }));
  };

  const addPurchase = async (
    event: FormEvent<HTMLFormElement>,
    cardId: string,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const purchase = {
      id: createId("purchase"),
      description: toStringValue(form.get("description")),
      amount: toNumber(form.get("amount")),
      purchaseDate: toStringValue(form.get("purchaseDate")),
      installments: Math.max(toNumber(form.get("installments")), 1),
      paidInstallments: 0,
      category: toStringValue(form.get("category")),
    };
    event.currentTarget.reset();
    await updateData((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === cardId
          ? { ...card, purchases: [purchase, ...card.purchases] }
          : card,
      ),
    }));
  };

  return (
    <section className="view-stack">
      <ViewTitle
        title={t("cards.title")}
        subtitle={t("cards.subtitle")}
      />
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={addCard}>
            <Row xs={1} md={2} xl={4} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>{t("cards.name")}</Form.Label>
                  <Form.Control name="name" required placeholder={t("placeholder.cardName")} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("cards.limit")}</Form.Label>
                  <Form.Control name="limit" required min="0" step="0.01" type="number" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("cards.closingDay")}</Form.Label>
                  <Form.Control name="closingDay" required min="1" max="31" type="number" defaultValue="25" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("cards.paymentDay")}</Form.Label>
                  <Form.Control name="paymentDay" required min="1" max="31" type="number" defaultValue="5" />
                </Form.Group>
              </Col>
              <Col>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="plus-lg" /> {t("cards.add")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Row xs={1} xl={2} className="g-3">
        {data.cards.map((card) => {
          const used = getUsedCardLimit(card);
          const monthly = getMonthlyCardPayment(card);
          const usage = card.limit > 0 ? Math.min((used / card.limit) * 100, 100) : 0;
          return (
            <Col key={card.id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between gap-3 mb-3">
                    <Card.Title className="mb-0 text-break">{card.name}</Card.Title>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      title={t("cards.deleteTitle")}
                      onClick={() =>
                        confirm({
                          title: t("cards.deleteTitle"),
                          message: `${t("cards.deleteMessage")}: "${card.name}".`,
                          confirmLabel: t("common.delete"),
                          variant: "danger",
                          onConfirm: () =>
                            updateData((current) => ({
                              ...current,
                              cards: current.cards.filter((item) => item.id !== card.id),
                            })),
                        })
                      }
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                  <StatPair
                    label={t("cards.usage")}
                    value={`${money(used)} / ${money(card.limit)}`}
                  />
                  <ProgressBar now={usage} className="mb-3" />
                  <StatPair label={t("cards.monthlyPayment")} value={money(monthly)} />
                  <StatPair label={t("cards.closePayment")} value={`${card.closingDay} / ${card.paymentDay}`} />

                  <Form className="mt-3" onSubmit={(event) => addPurchase(event, card.id)}>
                    <Row xs={1} md={2} className="g-2 align-items-end">
                      <Col md={12}>
                        <Form.Control name="description" required placeholder={t("cards.purchase")} />
                      </Col>
                      <Col>
                        <Form.Control name="amount" required min="0" step="0.01" type="number" placeholder={t("expenses.amount")} />
                      </Col>
                      <Col>
                        <Form.Control name="purchaseDate" required type="date" defaultValue={todayIso()} />
                      </Col>
                      <Col>
                        <Form.Control name="installments" min="1" type="number" defaultValue="1" />
                      </Col>
                      <Col>
                        <Form.Select name="category" defaultValue="Compras">
                          {expenseCategories.map((category) => (
                            <option key={category} value={category}>
                              {localizeDataLabel(category, language)}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col md={12}>
                        <Button type="submit" variant="primary" className="w-100">
                          <Icon name="plus-lg" /> {t("cards.purchase")}
                        </Button>
                      </Col>
                    </Row>
                  </Form>

                  <ListGroup variant="flush" className="mt-3 card-purchase-list">
                    {card.purchases.map((purchase) => (
                      <ListGroup.Item
                        className="px-0 d-flex flex-column flex-md-row gap-2 justify-content-between"
                        key={purchase.id}
                      >
                        <div className="min-w-0">
                          <strong className="d-block">{purchase.description}</strong>
                          <span className="text-secondary">
                            {purchase.paidInstallments}/{purchase.installments} {t("cards.installments")}
                          </span>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <strong>{money(purchase.amount)}</strong>
                          <Button
                            variant="outline-success"
                            size="sm"
                            title={t("cards.payInstallment")}
                            onClick={() =>
                              updateData((current) => ({
                                ...current,
                                cards: current.cards.map((item) =>
                                  item.id === card.id
                                    ? {
                                        ...item,
                                        purchases: item.purchases.map((entry) =>
                                          entry.id === purchase.id
                                            ? {
                                                ...entry,
                                                paidInstallments: Math.min(
                                                  entry.paidInstallments + 1,
                                                  entry.installments,
                                                ),
                                              }
                                            : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          >
                            <Icon name="check2" />
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
        {data.cards.length === 0 && (
          <Col>
            <EmptyCard text={t("cards.empty")} />
          </Col>
        )}
      </Row>
    </section>
  );
}


