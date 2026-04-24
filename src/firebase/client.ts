import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function readEnv(name: string): string | undefined {
  const v = import.meta.env[name as keyof ImportMetaEnv];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY") ?? "AIzaSyCoXZyh9sdsXUnxtu_Gu3DXInOCPVz684Y",
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN") ?? "mind-map-6eb98.firebaseapp.com",
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID") ?? "mind-map-6eb98",
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET") ?? "mind-map-6eb98.firebasestorage.app",
  messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") ?? "767805370040",
  appId: readEnv("VITE_FIREBASE_APP_ID") ?? "1:767805370040:web:79dcaf4ef00e53a16e4e4d",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}

export function getDb(): Firestore | null {
  const a = getFirebaseApp();
  return a ? getFirestore(a) : null;
}
