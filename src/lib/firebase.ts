import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

// יאוכלס אחרי יצירת פרויקט Firebase — הערכים נשמרים ב-.env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.projectId) return null; // עדיין לא הוגדר פרויקט
  return getApps()[0] ?? initializeApp(firebaseConfig);
}
