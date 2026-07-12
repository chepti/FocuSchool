/* eslint-disable no-undef */
// Service worker לקבלת נוטיפיקציות FCM ברקע.
// חייב לשבת ב-scope השורש, לכן הוא ב-public/ ולא ב-src.
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js",
);

// קונפיגורציה ציבורית — זהה ל-src/lib/firebase.ts (לא סוד)
firebase.initializeApp({
  apiKey: "AIzaSyD8izbQwpjZL7c-3dwD3tmcWD4LL0NDjcA",
  authDomain: "focuschool-aa45d.firebaseapp.com",
  projectId: "focuschool-aa45d",
  storageBucket: "focuschool-aa45d.firebasestorage.app",
  messagingSenderId: "832652546416",
  appId: "1:832652546416:web:b64b5d508a88168429bfb5",
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
