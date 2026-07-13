import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseApp } from "./firebase";
import { firebaseConfig } from "./config";

const NOTIFICATION_OPTS = {
  icon: "/icon.svg",
  dir: "rtl",
  lang: "he",
} as const;

// ה-service worker הוא קובץ סטטי ולא רואה env — לכן מעבירים לו את קונפיג
// ה-Firestore/FCM כפרמטרים ב-URL בעת הרישום. כך כל בית ספר שמעתיק את
// הפרויקט עובד עם ה-Firebase שלו בלי לערוך את firebase-messaging-sw.js.
const SW_URL = `/firebase-messaging-sw.js?${new URLSearchParams({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}).toString()}`;

export type PushSubscribeResult = "ok" | "denied" | "unsupported" | "error";

/**
 * הרשמה לנוטיפיקציות: הרשאת דפדפן → טוקן FCM → שמירה
 * ב-members/{email}/tokens/{token} (מזהה המסמך הוא הטוקן עצמו).
 */
export async function subscribeToPush(
  schoolId: string,
  email: string,
): Promise<PushSubscribeResult> {
  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey || !("serviceWorker" in navigator) || !(await isSupported())) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const registration = await navigator.serviceWorker.register(SW_URL);
    const token = await getToken(getMessaging(getFirebaseApp()), {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return "error";

    await setDoc(
      doc(
        getDb(),
        "schools",
        schoolId,
        "members",
        email.toLowerCase(),
        "tokens",
        token,
      ),
      {
        createdAt: new Date().toISOString(),
        ua: navigator.userAgent.slice(0, 200),
      },
    );

    // הודעת בדיקה מקומית — מאשרת שההתקן באמת מציג נוטיפיקציות
    await registration.showNotification("נרשמתם לעדכונים 🎉", {
      ...NOTIFICATION_OPTS,
      body: "כך ייראו הודעות מבית הספר. אפשר לסגור אותי.",
    });
    return "ok";
  } catch {
    return "error";
  }
}

/**
 * הודעות שמגיעות כשהאתר פתוח על המסך (foreground) לא מוצגות אוטומטית —
 * המאזין הזה מציג אותן ידנית דרך ה-service worker.
 * מחזיר פונקציית ניתוק (לניקוי ב-useEffect).
 */
export async function attachForegroundNotifications(): Promise<
  (() => void) | undefined
> {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator) ||
    !(await isSupported())
  ) {
    return undefined;
  }
  return onMessage(getMessaging(getFirebaseApp()), async (payload) => {
    const registration =
      (await navigator.serviceWorker.getRegistration("/")) ??
      (await navigator.serviceWorker.ready);
    await registration.showNotification(
      payload.notification?.title ?? "עדכון מבית הספר",
      {
        ...NOTIFICATION_OPTS,
        body: payload.notification?.body ?? "",
      },
    );
  });
}
