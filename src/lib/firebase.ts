import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

// הקונפיג הציבורי יושב ב-config.ts (ניתן לשינוי דרך env לכל בית ספר).
export function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** לשימוש ברכיבי לקוח בלבד */
export function getAuthClient(): Auth {
  return getAuth(getFirebaseApp());
}
