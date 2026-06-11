import { Button, Card, Form, Row, Col } from "react-bootstrap";
import type { AppData, UserSettings, Language, ConfirmOptions } from "../../types";
import type { FormEvent } from "react";
import { toStringValue, toNumber } from "../../utils";
import { Icon } from "../layout/Icon";
import { useDateFormatter, useLanguage, useMoney, useT } from "../../contexts";
import { getCurrencyOption, currencyOptions } from "../../data/defaults";
import { languageOptions, getLanguageOption } from "../../lib/i18n";
import { SectionTitle, ViewTitle, ActionCard } from "../ui/SharedComponents";

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
  const selectedCurrency = getCurrencyOption(data.settings.currencyCountry);
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
                  <Form.Select name="currencyOption" defaultValue={selectedCurrency.id}>
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
                    min="1"
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
    </section>
  );
}
