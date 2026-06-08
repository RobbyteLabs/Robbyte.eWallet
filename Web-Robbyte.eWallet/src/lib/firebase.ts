import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8VCymNCBoc3agYA1X1S8Av-oRas_qodE",
  authDomain: "robbyte-ewallet.firebaseapp.com",
  projectId: "robbyte-ewallet",
  storageBucket: "robbyte-ewallet.firebasestorage.app",
  messagingSenderId: "1046422049045",
  appId: "1:1046422049045:web:f7f4098351f93e002b991c",
  measurementId: "G-18MGPK24LC",
};

export const firebaseApp = initializeApp(firebaseConfig);

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as
  | string
  | undefined;

if (recaptchaSiteKey) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
