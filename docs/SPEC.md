# SPEC — פוקוסקול (FocuSchool)

> מסמך העבודה המרכזי. כל סשן פיתוח (בכל מודל) מתחיל בקריאת המסמך הזה.
> עדכון אחרון: 2026-07-09. חזון מלא: [VISION.md](VISION.md) · ארכיטקטורה: [ARCHITECTURE.md](ARCHITECTURE.md)

## תמצית

כלי שמאפשר לבית ספר להפעיל אתר בית ספרי בקלות — זורם, כייפי, חצי־אוטומטי, מהנייד.
Multi-tenant מהיסוד: כל הדאטה תחת `schools/{schoolId}`, כדי שבתי ספר נוספים ישוכפלו בקלות.

**אילוץ־על: הכול חייב לרוץ על שכבות חינם בלבד** — Vercel Hobby + Firebase Spark.
אסור שום שירות שדורש כרטיס אשראי או Blaze (החלטת בעלת המוצר — ראו זיכרון billing-fear).
לכן: אין Cloud Functions (משתמשים ב־Next.js server על Vercel), אין Firebase Storage
(קבצים/תמונות = קישורים ל־Google Drive/Photos), FCM ו־Firestore ו־Auth — כן (חינם).

---

## תשתית — עובדות שחובה לדעת

| דבר | ערך |
|---|---|
| ריפו | https://github.com/chepti/FocuSchool (branch `main`) |
| פרודקשן | https://focuschool.chepti.com (וגם focuschool.vercel.app) |
| Vercel | פרויקט `cheptis-projects/focuschool`, פריסה אוטומטית מכל push ל-main |
| Firebase project | `focuschool-aa45d` |
| Firestore | database `(default)`, region `me-west1` (תל אביב) |
| Web app id | `1:832652546416:web:b64b5d508a88168429bfb5` |
| קונפיג פיירבייס | מוטמע בקוד ב-`src/lib/firebase.ts` (ציבורי, לא סוד; env יכול לעקוף) |

### CLI וטריקים (Windows, שם משתמש בעברית!)

- `firebase` CLI מחובר כ-chepti@gmail.com. עובד רגיל.
- `vercel` CLI מחובר, אבל **חובה** תמיד: `vercel --global-config "T:\CURSOR2\.vercel-cli" <cmd>`
  (שם המשתמש בעברית שובר את תיקיית הקונפיג הרגילה — שגיאת EXDEV).
- זריעת דאטה: `npm run seed` (scripts/seed.ts). משתמש ב-refresh token של firebase-tools
  מ-`~/.config/configstore/firebase-tools.json` וכותב דרך Firestore REST (עוקף rules ברמת IAM).
  באותה שיטה אפשר להפעיל APIs (serviceusage) ולערוך הגדרות Auth (identitytoolkit) — כבר נעשה.
- פריסת rules: `firebase deploy --only firestore:rules`
- דומיינים מורשים ל-Auth כבר כוללים: localhost, vercel.app, chepti.com.

### תהליך עבודה מחייב

1. אחרי כל שינוי: `npm run build` נקי → commit → `git push origin main` (זו הפריסה).
2. בדיקות מקומיות: שרת dev דרך `.claude/launch.json` (שם: focuschool-dev, פורט 3000).
3. עיצוב: עברית, RTL, פונט Fredoka (משקל 500 לכותרות), צבעי המותג ב-globals.css
   (ink #2f0b69, pink #f531a6, purple #aa31f5, violet #7818a7, blue #272f89, magenta #6f1076).
   שפה חמה וכייפית ("מה היה לנו", "רגעים מהשטח"), פינות מעוגלות rounded-2xl.

---

## מודל נתונים (Firestore)

```
schools/{schoolId}                    # name, description, city, icalUrl?, calendarId?
  members/{email-lowercase}           # role: admin|publisher|contributor (בעתיד: parent), name
                                      # בעתיד להורה: classes: ["ב2"], phone
  strips/{stripId}                    # type: photos|files|posts|links, title, order, visible
    items/{itemId}                    # status: pending|published, title, body?, url?,
                                      # emoji?, gradient?, date (ISO), createdBy
  events/{eventId}                    # title, date (ISO), grades: [], publicInfo
                                      # אסור staffInfo כאן (אין אבטחת שדות) — מסמך משנה בעתיד
  ---- מתוכנן (שלב 2+) ----
  classes/{classId}                   # name ("ב2"), grade ("ב")
  schedules/{classId}                 # מערכת שעות: days[6][8] של {subject, teacher}
  staff/{staffId}                     # אלפון מורים: name, subjects, classes, email?, phone?
  messages/{messageId}                # type: weekly|reminder|targeted, to: {grades?/classes?/emails?},
                                      # body, sendAt?, createdBy
  checklists/{checklistId}            # title, classId, items: [{studentEmailKey, parentDone, teacherDone}]
  signups/{signupId}                  # eventId, slots: [{label, max, takenBy: []}]
  polls/{pollId}                      # question, options, votes (שלב 4)
```

## תפקידים והרשאות (rules — כבר פרוס)

- אנונימי: קריאת תוכן מפורסם בלבד (items רק status==published).
- `contributor`: יצירת item עם status=pending בלבד.
- `publisher`/`admin`: יצירה עם published/pending, עדכון, מחיקה, רואים pending.
- חבר רואה את רשומת ה-member של עצמו בלבד. כתיבת members — רק seed/console כרגע.
- זיהוי לפי `request.auth.token.email.lower()` == מזהה מסמך ה-member.

## קונבנציות יומן גוגל (מודול הסנכרון)

- בית הספר שם ביומן, והמזכירה עובדת רגיל ביומן גוגל — האתר שואב.
- `schools/{id}.icalUrl` = כתובת ICS (Secret address או ציבורית) → נשאב ב-SSR עם קאש 5 דקות.
- `schools/{id}.calendarId` = מזהה יומן ציבורי → כפתור "הוסיפו ליומן שלכם".
- **שכבות:** בכותרת האירוע `[א,ב]` או `[כולם]` (ברירת מחדל: כולם). התגית מוסרת מהכותרת בתצוגה.
- **מידע צוות:** בתיאור האירוע, כל מה שאחרי שורת `---צוות---` הוא לצוות בלבד
  (בשלב זה פשוט לא מוצג באתר; בשלב 2 יוצג למורים מחוברים).
- אירועים חוזרים (RRULE) — לא נתמכים עדיין (backlog).

---

## מפת מודולים ושלבים

### שלב 1 — MVP האתר הציבורי — ✅ הושלם (2026-07-09)

- [x] רצועות תוכן נגללות (פוסטים/קבצים/תמונות/קישורים) מ-Firestore עם fallback לדמו
- [x] הוספת פריט מהנייד (/add) לפי תפקיד, זרימת אישור (/manage)
- [x] התחברות Google, member roles, security rules
- [x] לוח אירועים חודשי: תאריך עברי (גימטריה ב-src/lib/hebrew-date.ts), מתג חיתוך חודש עברי/לועזי, פאנל פירוט
- [x] סנכרון יומן גוגל דרך ICS (src/lib/ical.ts) + כפתור הוספה ליומן
- [x] SEO: SSR/ISR, JSON-LD, sitemap, robots, canonical
- [x] PWA בסיסי: manifest (התקנה למסך הבית; נוטיפיקציות בשלב 2)
- [x] פביקון ממסגרת הפוקוס של הלוגו (src/app/icon.svg)

### שלב 2 — הורים מזוהים (הבא בתור)

1. **רשימת הורים:** מסך אדמין להדבקת CSV (שם, מייל, טלפון, כיתות) → נכתב ל-members עם role=parent.
   חלופה זולה: זריעה מקובץ. חשוב: מייל = מזהה, lowercase.
2. **תצוגת הורה:** הורה מחובר רואה בדף הבית גם: מערכת שעות של הכיתות שלו,
   אלפון מורים של הכיתה (schools/{id}/staff מסונן), קישורי אלבומי תמונות מוגנים
   (שדה protectedUrl ב-items של רצועת תמונות — נשלף רק אם ההורה מחובר; rules: קריאת השדה
   דרך מסמך משנה items/{id}/private/parent או רצועה נפרדת visible=parents).
3. **PWA push:** FCM Web Push (חינם). service worker + בקשת הרשאה + טוקנים ב-members/{email}/tokens.
   שליחה: route ב-Next (App Route) עם FCM HTTP v1 — דורש service account JSON ב-env של Vercel (חינם, לא Blaze).
4. **rules:** role=parent — קריאה בלבד של schedules/staff/protected, לא כתיבת items.

### שלב 3 — תקשורת ומעקב

1. **עדכון שבועי של מחנך:** messages type=weekly משויך לכיתה; מוצג להורי הכיתה + נשלח push.
2. **צ'קליסטים / שיעורי בית:** checklist לכיתה עם סימון כפול (הורה מסמן, מורה מסמן) —
   לתלמידים במעקב. UI: מסך למורה, שורה להורה בדף שלו.
3. **הודעות ממוקדות:** המורה בוחר תלמידים (בדיקת קלמרים) → הודעה רק להורים שלהם.
4. **תזכורות מתוזמנות:** messages עם sendAt עתידי. ללא Cloud Functions: Vercel Cron (חינם, פעם ביום)
   או בדיקה בזמן טעינה + push בעת ההגעה. להתחיל ב-Vercel Cron יומי.
5. **רשימות כיבוד:** signups עם slots ומגבלת כמות; הורה משתבץ, אכיפת max בטרנזקציה.

### שלב 4 — ועד הורים + שכפול

- מבנה ארגוני, החלטות ועד (רצועה ייעודית), סימון דמי ועד (רשומת member),
  אירועי כיתה עם אישורי הגעה (signups), סקרים (polls).
- **שכפול:** מסך יצירת בית ספר חדש → מסמך school + strips ברירת מחדל + admin ראשון.
  routing: דומיין/סאב-דומיין לכל בית ספר או path /s/{schoolId} (להחליט).

## backlog קטן

- אימוג'י → תמונות אמיתיות ברצועת תמונות (קישורי Photos)
- דף 404 ממותג, עמוד "אודות" לבית ספר
- RRULE ביומן, אירועים מרובי-ימים
- העלאת favicon.ico/PNG לדפדפנים ישנים
- בדיקת נגישות (a11y) מלאה — חשוב לאתר ציבורי של בי"ס
