import crypto from "node:crypto";

/**
 * עזרי שרת ל-push: OAuth של service account (בלי firebase-admin),
 * קריאת members וטוקנים דרך Firestore REST, ושליחה ב-FCM HTTP v1.
 * לשימוש ב-App Routes בלבד — לעולם לא ברכיבי לקוח.
 */

export const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "focuschool-aa45d";
export const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
  "AIzaSyD8izbQwpjZL7c-3dwD3tmcWD4LL0NDjcA";
export const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
export const SITE_URL = "https://focuschool.chepti.com/";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function serviceAccountToken(): Promise<string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env is missing");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(sa.private_key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** אימות ID token של המבקש → כתובת המייל שלו */
export async function callerEmail(idToken: string): Promise<string | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: { email?: string }[] };
  return data.users?.[0]?.email?.toLowerCase() ?? null;
}

export async function isStaffEmail(
  saToken: string,
  schoolId: string,
  email: string,
): Promise<boolean> {
  const res = await fetch(
    `${FIRESTORE}/schools/${schoolId}/members/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${saToken}` } },
  );
  if (!res.ok) return false;
  const doc = (await res.json()) as {
    fields?: { role?: { stringValue?: string } };
  };
  const role = doc.fields?.role?.stringValue;
  return role === "admin" || role === "publisher";
}

export interface MemberInfo {
  email: string;
  /** נתיב המסמך המלא ב-REST */
  path: string;
  classes: string[];
  /** העדפת התראות על פניות — ברירת מחדל immediate */
  digest: "immediate" | "daily" | "weekly";
}

export async function listMembers(
  saToken: string,
  schoolId: string,
): Promise<MemberInfo[]> {
  const res = await fetch(
    `${FIRESTORE}/schools/${schoolId}/members?pageSize=300`,
    { headers: { Authorization: `Bearer ${saToken}` } },
  );
  if (!res.ok) throw new Error(`members list: ${res.status}`);
  const data = (await res.json()) as {
    documents?: {
      name: string;
      fields?: {
        classes?: { arrayValue?: { values?: { stringValue?: string }[] } };
        digest?: { stringValue?: string };
      };
    }[];
  };
  return (data.documents ?? []).map((d) => {
    const digest = d.fields?.digest?.stringValue;
    return {
      email: decodeURIComponent(d.name.split("/").pop() as string),
      path: d.name,
      classes: (d.fields?.classes?.arrayValue?.values ?? [])
        .map((v) => v.stringValue)
        .filter((v): v is string => Boolean(v)),
      digest: (digest === "daily" || digest === "weekly"
        ? digest
        : "immediate") as MemberInfo["digest"],
    };
  });
}

export interface TokenDoc {
  /** הטוקן עצמו = מזהה המסמך */
  token: string;
  path: string;
}

/** כל הטוקנים של החברים הנתונים */
export async function tokensForMembers(
  saToken: string,
  members: MemberInfo[],
): Promise<TokenDoc[]> {
  const headers = { Authorization: `Bearer ${saToken}` };
  const lists = await Promise.all(
    members.map(async (m) => {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/${m.path}/tokens?pageSize=50`,
        { headers },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { documents?: { name: string }[] };
      return (data.documents ?? []).map((d) => ({
        token: d.name.split("/").pop() as string,
        path: d.name,
      }));
    }),
  );
  return lists.flat();
}

export async function sendToToken(
  saToken: string,
  target: TokenDoc,
  title: string,
  body: string,
): Promise<"sent" | "gone" | "failed"> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: target.token,
          notification: { title, body },
          webpush: { fcmOptions: { link: SITE_URL } },
        },
      }),
    },
  );
  if (res.ok) return "sent";
  const errorText = await res.text();
  console.error(
    `[push] FCM ${res.status} for ${target.token.slice(0, 20)}…: ${errorText}`,
  );
  // רק טוקן שבאמת פג (UNREGISTERED) נמחק — לא כל שגיאת 400
  if (res.status === 404 || errorText.includes("UNREGISTERED")) {
    await fetch(`https://firestore.googleapis.com/v1/${target.path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${saToken}` },
    }).catch(() => {});
    return "gone";
  }
  return "failed";
}
