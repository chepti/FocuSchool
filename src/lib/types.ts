// מודל הנתונים — ישקף בהמשך את מבנה Firestore תחת schools/{schoolId}

export type StripType = "photos" | "files" | "posts" | "links";

export type ItemStatus = "pending" | "published";

export interface School {
  id: string;
  name: string;
  description: string;
  city: string;
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

export type MemberRole = "admin" | "publisher" | "contributor";

/** חבר צוות/קהילה — מזוהה לפי כתובת מייל (מזהה המסמך, באותיות קטנות) */
export interface Member {
  role: MemberRole;
  name?: string;
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
