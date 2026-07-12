import crypto from "node:crypto";

/**
 * שליחת נוטיפיקציות FCM לכל הטוקנים הרשומים של בית הספר.
 * מורשה לצוות בלבד (admin/publisher) — מאומת לפי ID token של Firebase.
 * רץ עם service account (env FIREBASE_SERVICE_ACCOUNT) — בלי firebase-admin,
 * כדי להישאר קלים: JWT חתום ידנית מול oauth2.googleapis.com.
 */

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "focuschool-aa45d";
const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
  "AIzaSyD8izbQwpjZL7c-3dwD3tmcWD4LL0NDjcA";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const SITE_URL = "https://focuschool.chepti.com/";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function serviceAccountToken(): Promise<string> {
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
async function callerEmail(idToken: string): Promise<string | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    users?: { email?: string; emailVerified?: boolean }[];
  };
  return data.users?.[0]?.email?.toLowerCase() ?? null;
}

async function isStaff(
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

interface TokenDoc {
  /** הטוקן עצמו = מזהה המסמך */
  token: string;
  /** נתיב המסמך המלא — למחיקת טוקנים שפגו */
  path: string;
}

/** כל הטוקנים של כל החברים (עד 300 חברים — מספיק בשלב הזה) */
async function collectTokens(
  saToken: string,
  schoolId: string,
): Promise<TokenDoc[]> {
  const headers = { Authorization: `Bearer ${saToken}` };
  const membersRes = await fetch(
    `${FIRESTORE}/schools/${schoolId}/members?pageSize=300&mask.fieldPaths=role`,
    { headers },
  );
  if (!membersRes.ok) throw new Error(`members list: ${membersRes.status}`);
  const membersData = (await membersRes.json()) as {
    documents?: { name: string }[];
  };
  const members = membersData.documents ?? [];

  const tokenLists = await Promise.all(
    members.map(async (m) => {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/${m.name}/tokens?pageSize=50`,
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
  return tokenLists.flat();
}

async function sendToToken(
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
  // טוקן שכבר לא רשום — מנקים מהדאטהבייס
  if (res.status === 404 || res.status === 400) {
    await fetch(`https://firestore.googleapis.com/v1/${target.path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${saToken}` },
    }).catch(() => {});
    return "gone";
  }
  return "failed";
}

export async function POST(request: Request) {
  const idToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, body, schoolId = "demo" } = (await request.json()) as {
    title?: string;
    body?: string;
    schoolId?: string;
  };
  if (!title?.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const [email, saToken] = await Promise.all([
      callerEmail(idToken),
      serviceAccountToken(),
    ]);
    if (!email || !(await isStaff(saToken, schoolId, email))) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const tokens = await collectTokens(saToken, schoolId);
    if (tokens.length === 0) {
      return Response.json({ sent: 0, failed: 0, devices: 0 });
    }

    const results = await Promise.all(
      tokens.map((t) => sendToToken(saToken, t, title.trim(), body ?? "")),
    );
    return Response.json({
      devices: tokens.length,
      sent: results.filter((r) => r === "sent").length,
      failed: results.filter((r) => r === "failed").length,
    });
  } catch (error) {
    console.error("[push]", error);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
