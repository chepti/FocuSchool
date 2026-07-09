/**
 * זריעת נתוני הדמו ל-Firestore — להרצה מקומית בלבד: npm run seed
 * משתמש באישורי firebase-tools המקומיים (עוקף את חוקי האבטחה דרך IAM,
 * כמו ה-CLI עצמו). לא רץ בפרודקשן ולא נחשף לדפדפן.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { demoEvents, demoSchool, demoStrips } from "../src/lib/demo-data";

const PROJECT_ID = "focuschool-aa45d";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// client_id/secret ציבוריים של firebase-tools (מוטמעים בקוד הפתוח של ה-CLI)
const CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

async function getAccessToken(): Promise<string> {
  const configPath = join(
    homedir(),
    ".config",
    "configstore",
    "firebase-tools.json",
  );
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const refreshToken: string | undefined = config?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("לא נמצא טוקן — יש להריץ קודם: firebase login");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLI_CLIENT_ID,
      client_secret: CLI_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type FirestoreValue = Record<string, unknown>;

function toValue(value: unknown): FirestoreValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toValue) } };
  }
  if (value && typeof value === "object") {
    return { mapValue: { fields: toFields(value as Record<string, unknown>) } };
  }
  throw new Error(`unsupported value: ${String(value)}`);
}

function toFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || key === "id") continue;
    fields[key] = toValue(value);
  }
  return fields;
}

async function setDoc(
  token: string,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    throw new Error(`${path}: ${res.status} ${await res.text()}`);
  }
  console.log(`✓ ${path}`);
}

// חברי בית הספר — מזהה המסמך הוא כתובת המייל באותיות קטנות
const members: Record<string, { role: string; name: string }> = {
  "chepti@gmail.com": { role: "admin", name: "חפציבה" },
};

async function main() {
  const token = await getAccessToken();
  const school = `schools/${demoSchool.id}`;

  await setDoc(token, school, { ...demoSchool });

  for (const [email, member] of Object.entries(members)) {
    await setDoc(token, `${school}/members/${email}`, member);
  }

  for (const strip of demoStrips) {
    const { items, ...meta } = strip;
    await setDoc(token, `${school}/strips/${strip.id}`, { ...meta });
    for (const item of items) {
      await setDoc(token, `${school}/strips/${strip.id}/items/${item.id}`, {
        ...item,
      });
    }
  }

  for (const event of demoEvents) {
    await setDoc(token, `${school}/events/${event.id}`, { ...event });
  }

  console.log("\nהזריעה הושלמה בהצלחה 🎉");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
