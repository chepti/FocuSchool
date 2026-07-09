<p align="center"><img src="assets/logo.svg" width="280" alt="פוקוסקול"></p>

# פוקוסקול — FocuSchool

כלי שעוזר לבית ספר להפעיל בקלות אתר בית ספרי — זורם, כייפי וחצי־אוטומטי.

- 📖 [החזון המלא](docs/VISION.md)
- 🏗️ [ארכיטקטורה](docs/ARCHITECTURE.md)

## סטאק

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Firebase (Firestore, Auth, Storage, Functions, FCM) · Firebase App Hosting

## הרצה מקומית

```bash
npm install
npm run dev
```

ואז לפתוח את http://localhost:3000

## מצב נוכחי

שלב 1 (MVP) בבנייה: אתר ציבורי עם רצועות תוכן ולוח אירועים, כרגע עם נתוני דמו ("בית ספר אופק") מתוך `src/lib/demo-data.ts`. השלב הבא: חיבור Firestore ופאנל ניהול.
