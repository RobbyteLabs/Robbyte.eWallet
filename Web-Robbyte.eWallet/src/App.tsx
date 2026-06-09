import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  ChangeEvent,
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Modal,
  Nav,
  Navbar,
  Offcanvas,
  ProgressBar,
  Row,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {
  defaultAppData,
  currencyOptions,
  expenseCategories,
  expensePriorities,
  getCurrencyOption,
  incomeCategories,
  paymentMethods,
} from "./data/defaults";
import {
  getExpenseCategoryTotals,
  getExpensePriorityTotals,
  getIncomeCategoryTotals,
  getMonthlyCardPayment,
  getMonthlyReport,
  getPaymentDues,
  getUpcomingAlerts,
  getUsedCardLimit,
} from "./lib/calculations";
import {
  deriveEncryptionKey,
  encryptedBackupName,
  generateSalt,
  orderedBlocks,
} from "./lib/crypto";
import { auth, googleProvider } from "./lib/firebase";
import { formatCurrency, formatDate, todayIso } from "./lib/format";
import {
  getLanguageOption,
  languageOptions,
  localizeDataLabel,
  translate,
  type TranslationKey,
} from "./lib/i18n";
import { createId } from "./lib/ids";
import {
  cacheEncryptedBlocks,
  clearCachedBlocks,
  decryptAppData,
  encryptAppData,
  hasAnyRemoteData,
  loadCachedBlocks,
  loadRemoteBlocks,
  saveRemoteBlocks,
  type EncryptedAppBlocks,
} from "./lib/storage";
import type {
  AppData,
  AppView,
  CreditCard,
  Expense,
  ExpenseKind,
  ExpensePriority,
  Frequency,
  Income,
  Language,
  Loan,
  PaymentDue,
  SyncState,
} from "./types";

type ToastTone = "success" | "danger" | "warning" | "info";

interface AppToast {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => Promise<void> | void;
}

const views: Array<{ id: AppView; labelKey: TranslationKey; icon: string }> = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: "speedometer2" },
  { id: "expenses", labelKey: "nav.expenses", icon: "wallet2" },
  { id: "loans", labelKey: "nav.loans", icon: "bank" },
  { id: "cards", labelKey: "nav.cards", icon: "credit-card" },
  { id: "calendar", labelKey: "nav.calendar", icon: "calendar-event" },
  { id: "reports", labelKey: "nav.reports", icon: "file-earmark-bar-graph" },
  { id: "backup", labelKey: "nav.backup", icon: "download" },
  { id: "settings", labelKey: "nav.settings", icon: "gear" },
];

const initialSync: SyncState = {
  status: "idle",
  message: "Esperando desbloqueo seguro",
};

const readFirstSalt = (blocks: EncryptedAppBlocks) => {
  for (const name of orderedBlocks) {
    if (blocks[name]?.salt) return blocks[name]?.salt;
  }
  return undefined;
};

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const toStringValue = (value: FormDataEntryValue | null) => String(value || "");

const MoneyFormatContext = createContext({
  currency: "PEN",
  locale: "es-PE",
});

const LanguageContext = createContext({
  language: "es" as Language,
  locale: "es-PE",
  t: (key: TranslationKey) => translate("es", key),
});

const useMoney = () => {
  const { currency, locale } = useContext(MoneyFormatContext);
  return useCallback(
    (value: number) => formatCurrency(value, currency, locale),
    [currency, locale],
  );
};

const useLanguage = () => useContext(LanguageContext);

const useT = () => useLanguage().t;

const useDateFormatter = () => {
  const { locale } = useLanguage();
  return useCallback((date: string) => formatDate(date, locale), [locale]);
};

const getErrorCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";

const authErrorMessage = (
  error: unknown,
  t: (key: TranslationKey) => string,
) => {
  const code = getErrorCode(error);
  if (code === "auth/unauthorized-domain") {
    return t("auth.domainError");
  }
  if (code === "auth/operation-not-allowed") {
    return t("auth.providerError");
  }
  if (code === "auth/popup-blocked") {
    return t("auth.popupBlocked");
  }
  if (code === "auth/popup-closed-by-user") {
    return t("auth.popupClosed");
  }
  return error instanceof Error ? error.message : t("auth.loginError");
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState("");
  const [data, setData] = useState<AppData>(defaultAppData);
  const [view, setView] = useState<AppView>("dashboard");
  const [sync, setSync] = useState<SyncState>(initialSync);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmOptions | null>(
    null,
  );
  const [alertToastKey, setAlertToastKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const languageOption = getLanguageOption(data.settings.language);
  const languageValue = useMemo(
    () => ({
      language: languageOption.code,
      locale: languageOption.locale,
      t: (key: TranslationKey) => translate(languageOption.code, key),
    }),
    [languageOption.code, languageOption.locale],
  );
  const t = languageValue.t;

  const pushToast = useCallback(
    (tone: ToastTone, title: string, message: string) => {
      setToasts((current) => [
        ...current,
        { id: createId("toast"), tone, title, message },
      ]);
    },
    [],
  );

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setCryptoKey(null);
        setSalt("");
        setMasterPin("");
        setData(defaultAppData);
        setSync(initialSync);
      }
    });
    return unsubscribe;
  }, []);

  const report = useMemo(() => getMonthlyReport(data), [data]);
  const dues = useMemo(() => getPaymentDues(data), [data]);
  const alerts = useMemo(() => getUpcomingAlerts(data), [data]);

  const persistData = async (
    nextData: AppData,
    nextKey = cryptoKey,
    nextSalt = salt,
  ) => {
    if (!user || !nextKey || !nextSalt) return;
    setSync({ status: "saving", message: t("sync.encrypting") });
    const blocks = await encryptAppData(nextData, nextKey, nextSalt);
    cacheEncryptedBlocks(user.uid, blocks);

    if (!navigator.onLine) {
      setSync({
        status: "offline",
        message: t("sync.localOnly"),
        lastSavedAt: new Date().toISOString(),
      });
      pushToast(
        "warning",
        t("toast.localSaveTitle"),
        t("toast.localSaveMessage"),
      );
      return;
    }

    try {
      await saveRemoteBlocks(user.uid, blocks);
      setSync({
        status: "idle",
        message: t("sync.synced"),
        lastSavedAt: new Date().toISOString(),
      });
      pushToast("success", t("toast.syncedTitle"), t("toast.syncedMessage"));
    } catch (error) {
      const message =
        error instanceof Error
          ? `${t("sync.firestoreFailed")}: ${error.message}`
          : t("sync.firestoreFailed");
      setSync({
        status: "error",
        message,
        lastSavedAt: new Date().toISOString(),
      });
      pushToast("warning", t("toast.firestoreTitle"), message);
    }
  };

  const updateData = async (producer: (current: AppData) => AppData) => {
    const nextData = producer(data);
    setData(nextData);
    await persistData(nextData);
  };

  const handleLogin = async () => {
    setAuthError("");
    setUnlockError("");
    try {
      await signInWithPopup(auth, googleProvider);
      pushToast("success", t("toast.loginTitle"), t("toast.loginMessage"));
    } catch (error) {
      const message = authErrorMessage(error, t);
      setAuthError(message);
      pushToast("danger", t("toast.authErrorTitle"), message);
    }
  };

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setUnlockError("");
    const normalizedPin = masterPin.trim();
    if (!/^\d{6}$/.test(normalizedPin)) {
      const message = t("auth.pinInvalid");
      setUnlockError(message);
      pushToast("danger", t("toast.pinInvalidTitle"), message);
      return;
    }
    setSync({ status: "loading", message: t("sync.loading") });

    try {
      let remoteBlocks: EncryptedAppBlocks = {};
      let remoteError = "";
      try {
        remoteBlocks = await loadRemoteBlocks(user.uid);
      } catch (error) {
        remoteError =
          error instanceof Error ? error.message : "No se pudo leer Firestore";
      }

      const cachedBlocks = loadCachedBlocks(user.uid);
      const blocksToRead = hasAnyRemoteData(remoteBlocks)
        ? remoteBlocks
        : cachedBlocks;
      const activeSalt = readFirstSalt(blocksToRead) || generateSalt();
      const key = await deriveEncryptionKey(normalizedPin, user.uid, activeSalt);

      if (hasAnyRemoteData(blocksToRead)) {
        const nextData = await decryptAppData(blocksToRead, key);
        setCryptoKey(key);
        setSalt(activeSalt);
        setMasterPin("");
        setData(nextData);
        cacheEncryptedBlocks(user.uid, blocksToRead);
        setSync({
          status: remoteError ? "offline" : "idle",
          message: remoteError
            ? t("sync.localOpen")
            : t("sync.remoteOpen"),
        });
        pushToast(
          remoteError ? "warning" : "success",
          t("toast.vaultUnlocked"),
          remoteError ? t("toast.vaultLocal") : t("toast.vaultRemote"),
        );
        return;
      }

      const firstData = structuredClone(defaultAppData);
      setCryptoKey(key);
      setSalt(activeSalt);
      setMasterPin("");
      setData(firstData);
      await persistData(firstData, key, activeSalt);
      setSync({
        status: remoteError ? "offline" : "idle",
        message: remoteError
          ? t("sync.newLocal")
          : t("sync.newRemote"),
      });
      pushToast("success", t("toast.vaultCreated"), t("toast.vaultCreatedMessage"));
    } catch (error) {
      const message =
        error instanceof Error
          ? `${t("auth.unlockFailed")} ${error.message}`
          : t("auth.unlockFailed");
      setUnlockError(message);
      setMasterPin("");
      setSync({ status: "error", message: t("sync.unlockFailed") });
      pushToast("danger", t("toast.unlockFailed"), message);
    }
  };

  useEffect(() => {
    if (!user || !cryptoKey || !salt) return;
    const handleOnline = () => {
      void persistData(data);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [cryptoKey, data, salt, user]);

  useEffect(() => {
    if (!cryptoKey || alerts.length === 0) return;
    const nextKey = alerts.map((alert) => `${alert.id}:${alert.status}`).join("|");
    if (nextKey === alertToastKey) return;
    setAlertToastKey(nextKey);
    pushToast(
      "warning",
      t("toast.dueTitle"),
      `${alerts.length} ${t("toast.dueMessage")}`,
    );
  }, [alertToastKey, alerts, cryptoKey, pushToast, t]);

  const handleLogout = async () => {
    setCryptoKey(null);
    setSalt("");
    setMasterPin("");
    await signOut(auth);
    pushToast("info", t("toast.logoutTitle"), t("toast.logoutMessage"));
  };

  const exportBackup = async () => {
    if (!cryptoKey || !salt) return;
    const blocks = await encryptAppData(data, cryptoKey, salt);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "Robbyte eWallet",
            version: 1,
            exportedAt: new Date().toISOString(),
            uid: user?.uid,
            encryptedData: blocks,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = encryptedBackupName();
    link.click();
    URL.revokeObjectURL(url);
    pushToast("success", t("toast.exportTitle"), t("toast.exportMessage"));
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user || !cryptoKey) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as {
        encryptedData?: EncryptedAppBlocks;
      };
      const blocks = parsed.encryptedData;
      if (!blocks || !hasAnyRemoteData(blocks)) {
        throw new Error("El archivo no contiene datos cifrados validos.");
      }

      const nextData = await decryptAppData(blocks, cryptoKey);
      setData(nextData);
      cacheEncryptedBlocks(user.uid, blocks);
      await saveRemoteBlocks(user.uid, blocks);
      setSync({
        status: "idle",
        message: t("sync.imported"),
        lastSavedAt: new Date().toISOString(),
      });
      pushToast("success", t("toast.importTitle"), t("toast.importMessage"));
    } catch (error) {
      const message =
        error instanceof Error
          ? `No se pudo importar: ${error.message}`
          : "No se pudo importar el backup";
      setSync({ status: "error", message });
      pushToast("danger", t("toast.importFailed"), message);
    } finally {
      event.target.value = "";
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmRequest) return;
    const action = confirmRequest.onConfirm;
    setConfirmRequest(null);
    await action();
  };

  const selectView = (nextView: AppView) => {
    setView(nextView);
    setMenuOpen(false);
  };

  const selectedCurrency = getCurrencyOption(
    data.settings.currency,
    data.settings.currencyCountry,
  );
  const moneyFormat = {
    currency: selectedCurrency.currency,
    locale: data.settings.currencyLocale || selectedCurrency.locale,
  };

  const toastLayer = (
    <ToastLayer toasts={toasts} onClose={removeToast} />
  );

  if (!authReady) {
    return (
      <LanguageContext.Provider value={languageValue}>
        <CenteredStatus label={t("auth.preparing")} />
        {toastLayer}
      </LanguageContext.Provider>
    );
  }

  if (!user) {
    return (
      <LanguageContext.Provider value={languageValue}>
        <AuthShell>
          {authError && <Alert variant="danger">{authError}</Alert>}
          <Button variant="primary" size="lg" className="w-100" onClick={handleLogin}>
            <Icon name="shield-check" /> {t("auth.loginWithGoogle")}
          </Button>
        </AuthShell>
        {toastLayer}
      </LanguageContext.Provider>
    );
  }

  if (!cryptoKey) {
    return (
      <LanguageContext.Provider value={languageValue}>
        <AuthShell userName={user.displayName || user.email || t("auth.user")}>
          <Form className="d-grid gap-3" onSubmit={handleUnlock}>
            <Form.Group controlId="masterPin">
              <Form.Label>{t("auth.pinLabel")}</Form.Label>
              <Form.Control
                type="password"
                value={masterPin}
                onChange={(event) =>
                  setMasterPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                pattern="\d{6}"
                minLength={6}
                maxLength={6}
                placeholder={t("auth.pinPlaceholder")}
                autoComplete="one-time-code"
                required
                autoFocus
              />
              <Form.Text>{t("auth.pinHelp")}</Form.Text>
            </Form.Group>
            <Button variant="primary" size="lg" type="submit">
              <Icon name="lock" /> {t("auth.unlock")}
            </Button>
            {unlockError && <Alert variant="danger">{unlockError}</Alert>}
            <Alert variant="info" className="mb-0">
              {t("auth.pinNotice")}
            </Alert>
          </Form>
        </AuthShell>
        {toastLayer}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={languageValue}>
      <>
        <MoneyFormatContext.Provider value={moneyFormat}>
        <div className="app-shell">
          <DesktopSidebar
            view={view}
            onSelect={selectView}
            onLogout={handleLogout}
          />
          <div className="app-main">
            <MobileNavbar
              view={view}
              open={menuOpen}
              onToggle={setMenuOpen}
              onSelect={selectView}
              onLogout={handleLogout}
            />
            <Container fluid className="app-content">
              <Header sync={sync} />
              {view === "dashboard" && (
                <Dashboard data={data} report={report} dues={dues} alerts={alerts} />
              )}
              {view === "expenses" && (
                <ExpensesView
                  data={data}
                  updateData={updateData}
                  confirm={setConfirmRequest}
                />
              )}
              {view === "loans" && (
                <LoansView
                  data={data}
                  updateData={updateData}
                  confirm={setConfirmRequest}
                />
              )}
              {view === "cards" && (
                <CardsView
                  data={data}
                  updateData={updateData}
                  confirm={setConfirmRequest}
                />
              )}
              {view === "calendar" && <CalendarView dues={dues} />}
              {view === "reports" && <ReportsView data={data} report={report} />}
              {view === "backup" && (
                <BackupView
                  onExport={exportBackup}
                  onImportClick={() => fileInputRef.current?.click()}
                  onClearCache={() =>
                    setConfirmRequest({
                      title: t("backup.clearConfirmTitle"),
                      message: t("backup.clearConfirmMessage"),
                      confirmLabel: t("backup.clearConfirm"),
                      variant: "danger",
                      onConfirm: () => {
                        if (user) clearCachedBlocks(user.uid);
                        setSync({
                          status: "idle",
                          message: t("sync.cacheCleared"),
                        });
                        pushToast(
                          "info",
                          t("toast.cacheTitle"),
                          t("toast.cacheMessage"),
                        );
                      },
                    })
                  }
                />
              )}
              {view === "settings" && (
                <SettingsView
                  data={data}
                  updateData={updateData}
                  confirm={setConfirmRequest}
                />
              )}
              <input
                ref={fileInputRef}
                className="d-none"
                type="file"
                accept="application/json"
                onChange={importBackup}
              />
            </Container>
          </div>
        </div>
        </MoneyFormatContext.Provider>
        <ConfirmModal
          request={confirmRequest}
          onCancel={() => setConfirmRequest(null)}
          onConfirm={runConfirmedAction}
        />
        {toastLayer}
      </>
    </LanguageContext.Provider>
  );
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <i className={`bi bi-${name} ${className}`} aria-hidden="true" />;
}

function AuthShell({
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

function CenteredStatus({ label }: { label: string }) {
  return (
    <main className="auth-screen">
      <Card className="auth-card text-center shadow border-0">
        <Card.Body className="p-4">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="mb-0">{label}</p>
        </Card.Body>
      </Card>
    </main>
  );
}
function DesktopSidebar({
  view,
  onSelect,
  onLogout,
}: {
  view: AppView;
  onSelect: (view: AppView) => void;
  onLogout: () => void;
}) {
  const t = useT();
  return (
    <aside className="app-sidebar d-none d-lg-flex">
      <div className="app-sidebar-brand">
        <div className="brand-mark">
          <Icon name="piggy-bank" />
        </div>
        <div className="min-w-0">
          <strong className="d-block text-white">Robbyte eWallet</strong>
          <span className="text-white-50 small">{t("app.personalFinance")}</span>
        </div>
      </div>
      <Nav className="app-sidebar-nav">
        {views.map((item) => (
          <Button
            key={item.id}
            variant="link"
            className={`app-sidebar-link ${item.id === view ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <Icon name={item.icon} /> {t(item.labelKey)}
          </Button>
        ))}
      </Nav>
      <div className="app-sidebar-footer">
        <Button
          variant="link"
          className="app-sidebar-link app-sidebar-logout"
          onClick={onLogout}
        >
          <Icon name="box-arrow-right" /> {t("common.logout")}
        </Button>
      </div>
    </aside>
  );
}

function MobileNavbar({
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

function Header({
  sync,
}: {
  sync: SyncState;
}) {
  const t = useT();
  const { locale } = useLanguage();
  const variant =
    sync.status === "error"
      ? "danger"
      : sync.status === "offline"
        ? "warning"
        : sync.status === "saving" || sync.status === "loading"
          ? "warning"
          : "success";
  return (
    <header className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center mb-4">
      <div className="min-w-0">
        <Badge bg={variant} className="sync-badge">
          {sync.status === "saving" || sync.status === "loading" ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : (
            <Icon name="cloud-check" className="me-2" />
          )}
          {sync.message}
        </Badge>
        {sync.lastSavedAt && (
          <span className="d-block d-sm-inline ms-sm-2 mt-2 mt-sm-0 text-secondary small">
            {t("common.lastSaved")}:{" "}
            {new Date(sync.lastSavedAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </header>
  );
}

function Dashboard({
  data,
  report,
  dues,
  alerts,
}: {
  data: AppData;
  report: ReturnType<typeof getMonthlyReport>;
  dues: ReturnType<typeof getPaymentDues>;
  alerts: ReturnType<typeof getUpcomingAlerts>;
}) {
  const money = useMoney();
  const t = useT();
  const selectedCurrency = getCurrencyOption(
    data.settings.currency,
    data.settings.currencyCountry,
  );

  return (
    <section className="view-stack">
      <ViewTitle
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <Row xs={1} md={2} xl={4} className="g-3">
        <Col>
          <MetricCard label={t("dashboard.monthlyIncome")} value={money(report.income)} />
        </Col>
        <Col>
          <MetricCard label={t("dashboard.fixedExpenses")} value={money(report.fixedExpenses)} />
        </Col>
        <Col>
          <MetricCard
            label={t("dashboard.cardsAndLoans")}
            value={money(report.cardPayments + report.loanPayments)}
          />
        </Col>
        <Col>
          <MetricCard
            label={t("dashboard.realAvailable")}
            value={money(report.available)}
            accent={report.available >= 0 ? "positive" : "negative"}
          />
        </Col>
      </Row>

      <Row xs={1} lg={2} className="g-3">
        <Col>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <SectionTitle title={t("dashboard.alerts")} count={alerts.length} />
              <PaymentList
                dues={alerts}
                emptyText={t("dashboard.noAlerts")}
                showStatus
              />
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <SectionTitle
                title={t("dashboard.commitments")}
                count={dues.filter((due) => due.status !== "paid").length}
              />
              <PaymentList
                dues={dues.slice(0, 8)}
                emptyText={t("dashboard.noCommitments")}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle
            title={t("dashboard.distribution")}
            count={`${selectedCurrency.country} - ${selectedCurrency.currency}`}
          />
          <div className="d-grid gap-3">
            <BudgetBar label={t("budget.fixed")} value={report.fixedExpenses} max={report.income} />
            <BudgetBar label={t("budget.variable")} value={report.variableExpenses} max={report.income} />
            <BudgetBar label={t("budget.loans")} value={report.loanPayments} max={report.income} />
            <BudgetBar label={t("budget.cards")} value={report.cardPayments} max={report.income} />
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

function ExpensesView({
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

function LoansView({
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

function CardsView({
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

function CalendarView({ dues }: { dues: ReturnType<typeof getPaymentDues> }) {
  const money = useMoney();
  const t = useT();
  const { locale } = useLanguage();

  return (
    <section className="view-stack">
      <ViewTitle title={t("calendar.title")} subtitle={t("calendar.subtitle")} />
      <Card className="shadow-sm">
        <Card.Body>
          <ListGroup variant="flush">
            {dues.map((due) => {
              const date = new Date(`${due.dueDate}T12:00:00`);
              return (
                <ListGroup.Item
                  className="px-0 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between"
                  key={due.id}
                >
                  <div className="d-flex align-items-center gap-3 min-w-0">
                    <div className="date-tile">
                      <strong>{date.getDate()}</strong>
                      <span>
                        {new Intl.DateTimeFormat(locale, { month: "short" }).format(date)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <strong className="d-block">{due.label}</strong>
                      <span className="text-secondary">{sourceLabel(due.source, t)}</span>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <strong>{money(due.amount)}</strong>
                    <StatusBadge status={due.status} />
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          {dues.length === 0 && <EmptyState text={t("calendar.empty")} />}
        </Card.Body>
      </Card>
    </section>
  );
}

function ReportsView({
  data,
  report,
}: {
  data: AppData;
  report: ReturnType<typeof getMonthlyReport>;
}) {
  const money = useMoney();
  const t = useT();
  const expenseCategoryTotals = getExpenseCategoryTotals(data);
  const expensePriorityTotals = getExpensePriorityTotals(data).map((item) => ({
    ...item,
    label: expensePriorityLabel(item.label as ExpensePriority, t),
  }));
  const incomeCategoryTotals = getIncomeCategoryTotals(data);

  return (
    <section className="view-stack">
      <ViewTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />
      <Row xs={1} md={2} xl={4} className="g-3">
        <Col>
          <MetricCard label={t("reports.month")} value={report.monthKey} />
        </Col>
        <Col>
          <MetricCard label={t("reports.income")} value={money(report.income)} />
        </Col>
        <Col>
          <MetricCard
            label={t("reports.totalCommitted")}
            value={money(
              report.fixedExpenses +
                report.variableExpenses +
                report.loanPayments +
                report.cardPayments,
            )}
          />
        </Col>
        <Col>
          <MetricCard label={t("reports.available")} value={money(report.available)} />
        </Col>
      </Row>
      <Card className="shadow-sm">
        <Card.Body>
          <SectionTitle
            title={t("reports.detail")}
            count={`${data.expenses.length + data.loans.length + data.cards.length} ${t("common.sources")}`}
          />
          <div className="d-grid gap-2">
            <ReportLine label={t("reports.fixedExpenses")} value={report.fixedExpenses} />
            <ReportLine label={t("reports.variableExpenses")} value={report.variableExpenses} />
            <ReportLine label={t("reports.loanPayments")} value={report.loanPayments} />
            <ReportLine label={t("reports.creditCards")} value={report.cardPayments} />
          </div>
        </Card.Body>
      </Card>
      <Row xs={1} lg={3} className="g-3">
        <Col>
          <AmountBreakdown
            title={t("reports.expenseByCategory")}
            items={expenseCategoryTotals}
            emptyText={t("reports.noExpenseCategories")}
          />
        </Col>
        <Col>
          <AmountBreakdown
            title={t("reports.expenseByScope")}
            items={expensePriorityTotals}
            emptyText={t("reports.noScopes")}
          />
        </Col>
        <Col>
          <AmountBreakdown
            title={t("reports.incomeByCategory")}
            items={incomeCategoryTotals}
            emptyText={t("reports.noIncomeCategories")}
          />
        </Col>
      </Row>
    </section>
  );
}

function BackupView({
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

function SettingsView({
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
    data.settings.currency,
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

function expensePriorityLabel(
  priority: ExpensePriority,
  t: (key: TranslationKey) => string,
) {
  const labels: Record<ExpensePriority, TranslationKey> = {
    essential: "priority.essential",
    lifestyle: "priority.lifestyle",
    savings: "priority.savings",
    debt: "priority.debt",
  };
  return labels[priority] ? t(labels[priority]) : t("common.noScope");
}

function sourceLabel(
  source: PaymentDue["source"],
  t: (key: TranslationKey) => string,
) {
  const labels: Record<PaymentDue["source"], TranslationKey> = {
    expense: "source.expense",
    loan: "source.loan",
    card: "source.card",
  };
  return t(labels[source]);
}

function AmountBreakdown({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ label: string; amount: number }>;
  emptyText: string;
}) {
  const money = useMoney();
  const { language } = useLanguage();
  const max = Math.max(...items.map((item) => item.amount), 0);
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <SectionTitle title={title} count={items.length} />
        {items.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <div className="d-grid gap-3">
            {items.map((item) => (
              <div key={item.label}>
                <div className="d-flex justify-content-between gap-3 mb-1">
                  <span className="text-secondary">
                    {localizeDataLabel(item.label, language)}
                  </span>
                  <strong>{money(item.amount)}</strong>
                </div>
                <ProgressBar now={max > 0 ? (item.amount / max) * 100 : 0} />
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  return (
    <Card className={`stat-card h-100 shadow-sm ${accent || ""}`}>
      <Card.Body>
        <span className="text-secondary fw-semibold">{label}</span>
        <strong className="d-block mt-3">{value}</strong>
      </Card.Body>
    </Card>
  );
}

function BudgetBar({ label, value, max }: { label: string; value: number; max: number }) {
  const money = useMoney();
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="d-flex justify-content-between gap-3 mb-1">
        <span className="text-secondary">{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <ProgressBar now={width} />
    </div>
  );
}

function PaymentList({
  dues,
  emptyText,
  showStatus,
}: {
  dues: PaymentDue[];
  emptyText: string;
  showStatus?: boolean;
}) {
  const money = useMoney();
  const t = useT();
  const date = useDateFormatter();

  if (dues.length === 0) return <EmptyState text={emptyText} />;
  return (
    <ListGroup variant="flush">
      {dues.map((due) => (
        <ListGroup.Item
          className="px-0 d-flex flex-column flex-sm-row gap-2 justify-content-between"
          key={due.id}
        >
          <div className="min-w-0">
            <strong className="d-block">{due.label}</strong>
            <span className="text-secondary">
              {sourceLabel(due.source, t)} - {date(due.dueDate)}
            </span>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 justify-content-sm-end">
            <strong>{money(due.amount)}</strong>
            {showStatus && <StatusBadge status={due.status} />}
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}

function StatusBadge({ status }: { status: "paid" | "due" | "overdue" }) {
  const t = useT();
  const labels: Record<"paid" | "due" | "overdue", TranslationKey> = {
    paid: "common.paid",
    due: "common.due",
    overdue: "common.overdue",
  };
  const variants = {
    paid: "success",
    due: "warning",
    overdue: "danger",
  };
  return <Badge bg={variants[status]}>{t(labels[status])}</Badge>;
}

function ReportLine({ label, value }: { label: string; value: number }) {
  const money = useMoney();

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between gap-1 border-bottom pb-2">
      <span className="text-secondary">{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <span className="text-secondary">{label}</span>
      <strong className="text-end">{value}</strong>
    </div>
  );
}

function ViewTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="h3 mb-1">{title}</h1>
      <p className="text-secondary mb-0">{subtitle}</p>
    </div>
  );
}

function SectionTitle({
  title,
  count,
}: {
  title: string;
  count: number | string;
}) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
      <h2 className="h5 mb-0">{title}</h2>
      <Badge bg="secondary">{count}</Badge>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  text,
  buttonLabel,
  variant,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  buttonLabel: string;
  variant: string;
  onClick: () => void;
}) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body className="d-grid gap-2 align-content-start">
        <Icon name={icon} className="fs-3 text-primary" />
        <Card.Title>{title}</Card.Title>
        <Card.Text className="text-secondary">{text}</Card.Text>
        <Button variant={variant} onClick={onClick}>
          <Icon name={icon} /> {buttonLabel}
        </Button>
      </Card.Body>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Alert variant="light" className="border mb-0 text-secondary">{text}</Alert>;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <EmptyState text={text} />
      </Card.Body>
    </Card>
  );
}

function ConfirmModal({
  request,
  onCancel,
  onConfirm,
}: {
  request: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useT();

  return (
    <Modal show={Boolean(request)} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{request?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{request?.message}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant={request?.variant || "danger"} onClick={onConfirm}>
          {request?.confirmLabel || t("common.confirm")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function ToastLayer({
  toasts,
  onClose,
}: {
  toasts: AppToast[];
  onClose: (id: string) => void;
}) {
  return (
    <ToastContainer position="top-end" className="position-fixed p-3 app-toast-layer">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          bg={toast.tone}
          delay={4500}
          autohide
          onClose={() => onClose(toast.id)}
        >
          <Toast.Header>
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body className={toast.tone === "warning" ? "" : "text-white"}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}


