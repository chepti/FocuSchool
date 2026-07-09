import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// קונפיגורציה ציבורית של אפליקציית הווב — לא סוד (האבטחה נאכפת ב-Security Rules).
// ניתן לעקוף עם משתני סביבה, למשל לבדיקות מול פרויקט אחר.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyD8izbQwpjZL7c-3dwD3tmcWD4LL0NDjcA",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "focuschool-aa45d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "focuschool-aa45d",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "focuschool-aa45d.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "832652546416",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:832652546416:web:b64b5d508a88168429bfb5",
};

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
