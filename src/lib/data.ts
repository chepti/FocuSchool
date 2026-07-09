import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { fetchIcalEvents } from "./ical";
import { demoEvents, demoSchool, demoStrips } from "./demo-data";
import type { School, SchoolEvent, Strip, StripItem } from "./types";

export interface SchoolData {
  school: School;
  strips: Strip[];
  events: SchoolEvent[];
  source: "firestore" | "demo";
}

/**
 * שליפת נתוני בית ספר מ-Firestore.
 * אם הדאטהבייס לא זמין או ריק — נסיגה שקטה לנתוני הדמו,
 * כך שהאתר תמיד עולה (וגם build מקומי עובד בלי רשת).
 */
export async function getSchoolData(schoolId = "demo"): Promise<SchoolData> {
  try {
    const db = getDb();

    const schoolSnap = await getDoc(doc(db, "schools", schoolId));
    if (!schoolSnap.exists()) throw new Error(`school "${schoolId}" not found`);
    const school = { id: schoolSnap.id, ...schoolSnap.data() } as School;

    const stripsSnap = await getDocs(
      query(collection(db, "schools", schoolId, "strips"), orderBy("order")),
    );
    const strips: Strip[] = await Promise.all(
      stripsSnap.docs.map(async (stripDoc) => {
        const itemsSnap = await getDocs(
          query(
            collection(stripDoc.ref, "items"),
            where("status", "==", "published"),
          ),
        );
        const items = itemsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as StripItem)
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        return { id: stripDoc.id, ...stripDoc.data(), items } as Strip;
      }),
    );

    const eventsSnap = await getDocs(
      collection(db, "schools", schoolId, "events"),
    );
    const events = eventsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as SchoolEvent,
    );

    // אירועים מיומן גוגל המחובר (אם הוגדר icalUrl בהגדרות בית הספר)
    if (school.icalUrl) {
      events.push(...(await fetchIcalEvents(school.icalUrl)));
    }

    return { school, strips, events, source: "firestore" };
  } catch (error) {
    console.log(
      `[focuschool] falling back to demo data: ${(error as Error).message}`,
    );
    return {
      school: demoSchool,
      strips: demoStrips,
      events: demoEvents,
      source: "demo",
    };
  }
}
