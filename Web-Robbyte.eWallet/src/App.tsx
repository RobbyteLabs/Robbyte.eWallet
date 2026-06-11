import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, Button, Container, Form } from "react-bootstrap";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { Icon } from "./components/layout/Icon";

import { defaultAppData } from './data/defaults';
import { getMonthlyReport, getPaymentDues, getUpcomingAlerts } from './lib/calculations';
import { deriveEncryptionKey, encryptedBackupName, generateSalt } from './lib/crypto';
import { auth, googleProvider } from "./lib/firebase";
import { todayIso } from './lib/format';

import { translate, type TranslationKey, getLanguageOption } from './lib/i18n';
import { createId } from './lib/ids';
import {
  cacheEncryptedBlocks, clearCachedBlocks, decryptAppData,
  encryptAppData, hasAnyRemoteData, loadCachedBlocks, loadRemoteBlocks, saveRemoteBlocks,
} from './lib/storage';
import type { EncryptedAppBlocks } from "./lib/storage";

import type { AppData, AppView, SyncState, ConfirmOptions } from './types';

import { MoneyFormatContext, LanguageContext, useMoney, useT, useDateFormatter } from "./contexts";
import { views, initialSync, readFirstSalt, toNumber, toStringValue, authErrorMessage, getCurrencyOption } from "./utils";

import { AuthShell } from "./components/layout/AuthShell";
import { CenteredStatus } from "./components/layout/CenteredStatus";
import { DesktopSidebar } from "./components/layout/DesktopSidebar";
import { MobileNavbar } from "./components/layout/MobileNavbar";
import { Header } from "./components/layout/Header";
import { FloatingActions } from "./components/layout/FloatingActions";

import { Dashboard } from "./components/views/Dashboard";
import { ExpensesView } from "./components/views/ExpensesView";
import { LoansView } from "./components/views/LoansView";
import { IncomesView } from "./components/views/IncomesView";
import { CardsView } from "./components/views/CardsView";
import { CalendarView } from "./components/views/CalendarView";
import { ReportsView } from "./components/views/ReportsView";
import { BackupView } from "./components/views/BackupView";
import { SettingsView } from "./components/views/SettingsView";

import { ConfirmModal, ToastLayer } from "./components/ui/SharedComponents";

type ToastTone = "success" | "danger" | "warning" | "info";

interface AppToast {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
}
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
      t: (key: string) => translate(languageOption.code, key as any),
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
              {view === "ingresos" && (
                <IncomesView
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
        <FloatingActions
          sync={sync}
          onSync={() => persistData(data)}
          updateData={updateData}
        />
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






