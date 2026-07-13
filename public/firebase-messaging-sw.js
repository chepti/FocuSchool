/* eslint-disable no-undef */
// Service worker לקבלת נוטיפיקציות FCM ברקע.
// חייב לשבת ב-scope השורש, לכן הוא ב-public/ ולא ב-src.
//
// הקובץ סטטי ולא רואה משתני סביבה — לכן קונפיג ה-Firebase מגיע כפרמטרים
// ב-URL של ה-SW (נקבע ב-src/lib/push.ts בעת הרישום). כך כל בית ספר שמעתיק
// את הפרויקט עובד עם ה-Firebase שלו בלי לערוך את הקובץ הזה.
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js",
);

const params = new URL(self.location).searchParams;

// נפילה חזרה לפרויקט הדמו אם הקובץ נטען בלי פרמטרים (למשל גישה ישירה)
firebase.initializeApp({
  apiKey: params.get("apiKey") || "AIzaSyD8izbQwpjZL7c-3dwD3tmcWD4LL0NDjcA",
  authDomain:
    params.get("authDomain") || "focuschool-aa45d.firebaseapp.com",
  projectId: params.get("projectId") || "focuschool-aa45d",
  messagingSenderId: params.get("messagingSenderId") || "832652546416",
  appId:
    params.get("appId") || "1:832652546416:web:b64b5d508a88168429bfb5",
});

const messaging = firebase.messaging();

// הודעות עם payload של notification מוצגות אוטומטית ע"י ה-SDK;
// זה גיבוי להודעות data בלבד.
messaging.onBackgroundMessage((payload) => {
  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "עדכון מבית הספר";
  const body =
    (payload.notification && payload.notification.body) ||
    (payload.data && payload.data.body) ||
    "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    dir: "rtl",
    lang: "he",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
