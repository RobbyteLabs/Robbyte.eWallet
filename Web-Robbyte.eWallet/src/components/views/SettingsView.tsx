import { Button, Card, Form, Row, Col, ListGroup } from "react-bootstrap";
import type { AppData, UserSettings, Language, Income, ConfirmOptions } from "../../types";
import type { FormEvent } from "react";
import { views, toStringValue, toNumber, createId } from "../../utils";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { todayIso } from "../../lib/format";
import { defaultAppData, getCurrencyOption, currencyOptions, expenseCategories, incomeCategories, paymentMethods } from "../../data/defaults";
import { languageOptions,
  getLanguageOption, localizeDataLabel } from "../../lib/i18n";
import { SectionTitle, ViewTitle, ActionCard, EmptyState } from "../ui/SharedComponents";

export function SettingsView({
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
  const selectedCurrency = getCurrencyOption(
    data.settings.currencyCountry,
  );
  const selectedLanguage = getLanguageOption(data.settings.language);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedCurrencyId = toStringValue(form.get("currencyOption"));
    const selectedLanguageCode = toStringValue(form.get("language")) as Language;
    const nextCurrency =
      currencyOptions.find((option) => option.id === selectedCurrencyId) ||
      selectedCurrency;
    const nextLanguage = getLanguageOption(selectedLanguageCode);

    await updateData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        currency: nextCurrency.currency,
        currencyCountry: nextCurrency.countryCode,
        currencyLocale: nextCurrency.locale,
        language: nextLanguage.code,
        monthlyIncome: toNumber(form.get("monthlyIncome")),
        alertDaysBefore: toNumber(form.get("alertDaysBefore")),
      },
    }));
  };

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
      <ViewTitle title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle title={t("settings.preferences")} count={selectedLanguage.label} />
          <Form onSubmit={saveSettings}>
            <Row xs={1} md={2} xl={4} className="g-3 align-items-end">
              <Col md={6} xl={3}>
                <Form.Group>
                  <Form.Label>{t("settings.language")}</Form.Label>
                  <Form.Select name="language" defaultValue={selectedLanguage.code}>
                    {languageOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} xl={4}>
                <Form.Group>
                  <Form.Label>{t("settings.mainCurrency")}</Form.Label>
                  <Form.Select
                    name="currencyOption"
                    defaultValue={selectedCurrency.id}
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.country} - {option.currencyName} ({option.currency})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text>
                    {t("common.country")}: {selectedCurrency.country} - {t("common.currency")}:{" "}
                    {selectedCurrency.currencyName} ({selectedCurrency.currency})
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("settings.baseIncome")}</Form.Label>
                  <Form.Control
                    name="monthlyIncome"
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    defaultValue={data.settings.monthlyIncome}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("settings.alertDays")}</Form.Label>
                  <Form.Control
                    name="alertDaysBefore"
                    required
                    min="1"
                    max="30"
                    type="number"
                    defaultValue={data.settings.alertDaysBefore}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="check2" /> {t("common.saveSettings")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={addIncome}>
            <Row xs={1} md={2} xl={5} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>{t("settings.incomeSource")}</Form.Label>
                  <Form.Control name="source" required placeholder={t("settings.incomeSourcePlaceholder")} />
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
                  <Form.Label>{t("settings.incomeCategory")}</Form.Label>
                  <Form.Select name="category" defaultValue="Salario">
                    {incomeCategories.map((category) => (
                      <option key={category} value={category}>
                        {localizeDataLabel(category, selectedLanguage.code)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>{t("settings.incomeDate")}</Form.Label>
                  <Form.Control name="date" required type="date" defaultValue={todayIso()} />
                </Form.Group>
              </Col>
              <Col xl={2}>
                <Form.Group>
                  <Form.Label>{t("settings.incomeNotes")}</Form.Label>
                  <Form.Control name="notes" placeholder={t("settings.incomeNotesPlaceholder")} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Check name="recurring" type="checkbox" label={t("common.recurring")} />
              </Col>
              <Col>
                <Button type="submit" variant="primary" className="w-100">
                  <Icon name="plus-lg" /> {t("settings.addIncome")}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle title={t("settings.incomes")} count={data.incomes.length} />
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
                      ? localizeDataLabel(income.category, selectedLanguage.code)
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
                    title={t("settings.deleteIncomeTitle")}
                    onClick={() =>
                      confirm({
                        title: t("settings.deleteIncomeTitle"),
                        message: `${t("settings.deleteIncomeMessage")} "${income.source}".`,
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
          {data.incomes.length === 0 && <EmptyState text={t("settings.noIncomes")} />}
        </Card.Body>
      </Card>
    </section>
  );
}

