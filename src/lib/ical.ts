import type { SchoolEvent } from "./types";

// שאיבת אירועים מיומן גוגל דרך כתובת ICS (ראו קונבנציות ב-docs/SPEC.md):
// [א,ב] בכותרת = שכבות; ---צוות--- בתיאור מפריד מידע ציבורי ממידע צוות.

const STAFF_SEPARATOR = "---צוות---";

function unfold(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/);
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** "20260901" או "20260901T170000Z" → { date: "2026-09-01", time?: "17:00" } */
function parseDtstart(raw: string): { date: string; time?: string } | null {
  const match = raw.match(/(\d{8})(T(\d{4}))?/);
  if (!match) return null;
  const d = match[1];
  const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const time = match[3]
    ? `${match[3].slice(0, 2)}:${match[3].slice(2, 4)}`
    : undefined;
  return { date, time };
}

/** חילוץ שכבות מהכותרת: "טיול [ה,ו]" → grades ["ה","ו"], title "טיול" */
function extractGrades(summary: string): { title: string; grades: string[] } {
  const match = summary.match(/\[([^\]]+)\]/);
  if (!match) return { title: summary.trim(), grades: [] };
  const title = summary.replace(match[0], "").trim();
  const inner = match[1].trim();
  if (inner === "כולם") return { title, grades: [] };
  const grades = inner
    .split(",")
    .map((g) => g.trim().replace(/[׳']/g, ""))
    .filter((g) => g.length > 0);
  return { title, grades };
}

export function parseIcs(ics: string): SchoolEvent[] {
  const events: SchoolEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of unfold(ics)) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (current?.SUMMARY && current?.DTSTART) {
        const parsed = parseDtstart(current.DTSTART);
        if (parsed) {
          const { title, grades } = extractGrades(unescapeText(current.SUMMARY));
          const description = unescapeText(current.DESCRIPTION ?? "");
          const publicInfo = description.split(STAFF_SEPARATOR)[0].trim();
          events.push({
            id: `ical-${current.UID ?? `${parsed.date}-${title}`}`,
            title,
            date: parsed.date,
            grades,
            publicInfo: parsed.time
              ? `🕐 ${parsed.time} · ${publicInfo}`.trim().replace(/·\s*$/, "")
              : publicInfo,
          });
        }
      }
      current = null;
    } else if (current) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).split(";")[0].toUpperCase();
        current[key] = line.slice(colon + 1);
      }
    }
  }
  return events;
}

/** שאיבת אירועים מכתובת ICS, עם קאש של 5 דקות (fetch של Next) */
export async function fetchIcalEvents(url: string): Promise<SchoolEvent[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`ICS fetch failed: ${res.status}`);
    return parseIcs(await res.text()).slice(0, 200);
  } catch (error) {
    console.log(`[focuschool] ical fetch failed: ${(error as Error).message}`);
    return [];
  }
}
