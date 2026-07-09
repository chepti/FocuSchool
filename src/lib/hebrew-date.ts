// המרות לתאריך עברי — שמות חודשים מגיעים מהלוח העברי המובנה ב-Intl,
// והמספרים (יום ושנה) מומרים לגימטריה אצלנו כי Intl לא תומך בספרות עבריות.

/** שם חודש עברי, למשל "אלול" */
const monthName = new Intl.DateTimeFormat("he-u-ca-hebrew", {
  month: "long",
});

/** מספרים לטיניים — לחישובים */
const numericLatn = new Intl.DateTimeFormat("en-u-ca-hebrew-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/** המרת מספר (1–999) לגימטריה עם גרשיים: 15 → ט״ו, 786 → תשפ״ו */
export function gematria(num: number): string {
  let n = num;
  let result = "";
  while (n >= 400) {
    result += "ת";
    n -= 400;
  }
  result += HUNDREDS[Math.floor(n / 100)];
  n %= 100;
  if (n === 15) {
    result += "טו";
  } else if (n === 16) {
    result += "טז";
  } else {
    result += TENS[Math.floor(n / 10)] + ONES[n % 10];
  }
  if (result.length === 1) return result + "׳";
  return result.slice(0, -1) + "״" + result.slice(-1);
}

interface HebrewParts {
  day: number;
  year: number;
  month: string;
}

function hebrewParts(date: Date): HebrewParts {
  const parts = numericLatn.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: parseInt(get("day") || "1", 10),
    year: parseInt(get("year") || "0", 10),
    month: get("month"),
  };
}

/** "ט״ו" */
export function hebrewDayLabel(date: Date): string {
  return gematria(hebrewParts(date).day);
}

/** מספר היום בחודש העברי (1–30) */
export function hebrewDayNumber(date: Date): number {
  return hebrewParts(date).day;
}

/** "תשרי תשפ״ז" */
export function hebrewMonthYearLabel(date: Date): string {
  const { year } = hebrewParts(date);
  return `${monthName.format(date)} ${gematria(year % 1000)}`;
}

/** "ט״ו בתשרי" */
export function hebrewDayMonthLabel(date: Date): string {
  const { day } = hebrewParts(date);
  return `${gematria(day)} ב${monthName.format(date)}`;
}

/** מזהה ייחודי של חודש עברי, למשל "5787-Tishri" — לקיבוץ ימים */
export function hebrewMonthKey(date: Date): string {
  const { year, month } = hebrewParts(date);
  return `${year}-${month}`;
}
