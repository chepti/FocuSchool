/**
 * תצורה לכל התקנה של פוקוסקול.
 *
 * המודל: כל בית ספר מעתיק (fork) את הפרויקט, מחבר Firebase + Vercel משלו,
 * ומגדיר את המשתנים כאן דרך משתני סביבה (env). ברירות המחדל הן בית ספר
 * הדמו ("אופק") — כך שהמאגר עובד מיד, וכל fork רק צריך למלא env משלו.
 *
 * כל הערכים כאן ציבוריים (לא סודות) — האבטחה נאכפת ב-Firestore Rules.
 * הסודות היחידים (service account, VAPID) יושבים כ-env בשרת בלבד (ראו README).
 */

// קונפיג אפליקציית הווב של Firebase — מ-Project settings → Your apps
export const firebaseConfig = {
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

/**
 * מזהה בית הספר במסד. לכל התקנה יש בית ספר אחד (מסמך schools/{SCHOOL_ID}).
 * ברירת מחדל "demo". להשאיר קצר ובאנגלית — משמש כמזהה מסמך.
 */
export const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID ?? "demo";

/**
 * שם בית הספר לתצוגת ה-PWA וה-metadata (SEO). תוכן האתר עצמו נשלף
 * מ-Firestore — הערכים כאן משמשים לכותרת הדפדפן, שם האפליקציה המותקנת ו-OG.
 */
export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "בית ספר אופק";

export const SCHOOL_DESCRIPTION =
  process.env.NEXT_PUBLIC_SCHOOL_DESCRIPTION ??
  "אתר בית הספר — עדכונים, תמונות, לוח אירועים וכל מה שקורה אצלנו. מופעל על ידי פוקוסקול.";

/** כתובת הפרודקשן — ל-metadataBase ולקישור בנוטיפיקציות */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://focuschool.chepti.com";
