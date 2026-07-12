// מודל הנתונים — ישקף בהמשך את מבנה Firestore תחת schools/{schoolId}

export type StripType = "photos" | "files" | "posts" | "links";

export type ItemStatus = "pending" | "published";

export interface School {
  id: string;
  name: string;
  description: string;
  city: string;
  /** כתובת ICS של יומן גוגל לשאיבת אירועים */
  icalUrl?: string;
  /** מזהה יומן ציבורי — לכפתור "הוסיפו ליומן שלכם" */
  calendarId?: string;
}

export interface Strip {
  id: string;
  type: StripType;
  title: string;
  order: number;
  visible: boolean;
  items: StripItem[];
}

export interface StripItem {
  id: string;
  status: ItemStatus;
  title: string;
  /** תיאור קצר / טקסט הפוסט */
  body?: string;
  /** קישור חיצוני או לקובץ */
  url?: string;
  /** תמונת רקע (עד שיחובר Storage — מחלקת גרדיאנט) */
  gradient?: string;
  emoji?: string;
  date?: string; // ISO
  /** מייל של מי שהעלה את הפריט */
  createdBy?: string;
}

export type MemberRole =
  | "admin"
  | "publisher"
  | "contributor"
  | "parent"
  | "committee";

/** העדפת קבלת התראות על פניות: מיידי / סיכום יומי / סיכום שבועי */
export type DigestPref = "immediate" | "daily" | "weekly";

/** חבר צוות/קהילה — מזוהה לפי כתובת מייל (מזהה המסמך, באותיות קטנות) */
export interface Member {
  role: MemberRole;
  name?: string;
  /** שיוך לכיתות, למשל ["ב2", "ה1"] — בעיקר להורים */
  classes?: string[];
  phone?: string;
  /** ברירת מחדל: immediate */
  digest?: DigestPref;
}

export interface Lesson {
  subject: string;
  teacher?: string;
}

/** יום לימודים — עטוף במפה כי Firestore לא מרשה מערך בתוך מערך */
export interface ScheduleDay {
  lessons: Lesson[];
}

/** מערכת שעות של כיתה — מסמך schedules/{classId}, עד 6 ימים */
export interface ClassSchedule {
  days: ScheduleDay[];
}

/** איש/אשת צוות באלפון — staff/{staffId} */
export interface StaffMember {
  id: string;
  name: string;
  subjects: string[];
  /** הכיתות שמלמד/ת, למשל ["ב2", "ב1"] */
  classes: string[];
  email?: string;
  phone?: string;
}

export type MessageType = "weekly" | "reminder" | "targeted";

/**
 * הודעה מהצוות — messages/{messageId}.
 * weekly: עדכון שבועי של מחנך לכיתה (classes=[כיתה], homework אופציונלי)
 * reminder: תזכורת לכיתות/שכבה/כולם, אפשר עם sendAt עתידי
 * targeted: הודעה אישית לתת-קבוצת הורים (emails)
 */
export interface SchoolMessage {
  id: string;
  type: MessageType;
  title?: string;
  body: string;
  /** weekly בלבד — "מה ניתן כשיעורי בית" */
  homework?: string;
  /** כיתות יעד; ריק/חסר = כל בית הספר */
  classes?: string[];
  /** targeted בלבד — מיילים של ההורים המסומנים */
  emails?: string[];
  createdBy: string;
  createdAt: string; // ISO
  /** מתי לשלוח push — מיידי או עתידי (תזכורת) */
  sendAt: string; // ISO
  /** ממתין לשליחת push? ה-dispatch מוריד את הדגל וקובע sentAt */
  pending: boolean;
  sentAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
}

/**
 * צ'קליסט במעקב — checklists/{id}. המורה בוחר הורים במעקב (emails);
 * הסימונים במסמכי משנה marks/{email}: ההורה מסמן בוצע-בבית,
 * המורה מסמן בוצע-בכיתה.
 */
export interface Checklist {
  id: string;
  title: string;
  classId?: string;
  emails: string[];
  items: ChecklistItem[];
  createdBy: string;
  createdAt: string; // ISO
}

/** marks/{email} — homeChecked נכתב רק ע"י ההורה, classChecked רק ע"י צוות */
export interface ChecklistMarks {
  homeChecked?: string[];
  classChecked?: string[];
}

export interface SignupSlot {
  id: string;
  label: string;
  max: number;
}

/**
 * רשימת שיבוץ/כיבוד — signups/{id}. counts מתוחזק בטרנזקציה יחד עם
 * ה-entry (entries/{email}) כדי לנעול משבצת מלאה בלי דריסות.
 */
export interface Signup {
  id: string;
  title: string;
  /** כיתות יעד; ריק = כל בית הספר */
  classes: string[];
  slots: SignupSlot[];
  counts: Record<string, number>;
  createdBy: string;
  createdAt: string; // ISO
}

/** entries/{email} — שיבוץ של הורה אחד */
export interface SignupEntry {
  slotId: string;
  name?: string;
  at: string; // ISO
}

export interface PollOption {
  id: string;
  label: string;
}

/**
 * סקר/הצבעה — polls/{id}; ההצבעות ב-votes/{email} (קול אחד לחבר).
 * נוצר ע"י ועד או צוות.
 */
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  /** כיתות יעד; ריק = כל בית הספר */
  classes: string[];
  open: boolean;
  createdBy: string;
  createdAt: string; // ISO
}

/** votes/{email} */
export interface PollVote {
  optionId: string;
  at: string; // ISO
}

/** דמי ועד — fees/{email}; גלוי לוועד ולאדמין בלבד (אוסף נפרד, לא שדה ב-member) */
export interface FeeRecord {
  paid: boolean;
  at?: string; // ISO
  updatedBy?: string;
}

/** פנייה לצוות — inquiries/{id}; notified מנוהל ע"י ה-dispatch */
export interface Inquiry {
  id: string;
  toEmail: string;
  fromEmail: string;
  fromName?: string;
  body: string;
  createdAt: string; // ISO
  notified: boolean;
  done?: boolean;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // ISO
  /** שכבות רלוונטיות, ריק = כל בית הספר */
  grades: string[];
  publicInfo: string;
  /** מוצג לצוות בלבד — אחרי המפריד ---צוות--- ביומן */
  staffInfo?: string;
}
