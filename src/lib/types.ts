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

export type MemberRole = "admin" | "publisher" | "contributor" | "parent";

/** חבר צוות/קהילה — מזוהה לפי כתובת מייל (מזהה המסמך, באותיות קטנות) */
export interface Member {
  role: MemberRole;
  name?: string;
  /** שיוך לכיתות, למשל ["ב2", "ה1"] — בעיקר להורים */
  classes?: string[];
  phone?: string;
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
