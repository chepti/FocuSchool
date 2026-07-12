import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseApp } from "./firebase";

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
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
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
    return "ok";
  } catch {
    return "error";
  }
}
