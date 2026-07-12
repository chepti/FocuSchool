import {
  FIRESTORE,
  listMembers,
  sendToToken,
  serviceAccountToken,
  tokensForMembers,
  type MemberInfo,
} from "@/lib/push-server";

/**
 * שולח push לכל ההודעות שהגיע זמנן (pending && sendAt <= now) ומסמן sentAt.
 * נקרא: (א) מיד אחרי יצירת הודעה במסך הכתיבה, (ב) פעם ביום ע"י Vercel Cron
 * (vercel.json) — כך תזכורות עתידיות נשלחות בזמן.
 * ללא אימות בכוונה: הפעולה בטוחה — שולחת רק מה שממילא מתוזמן, ואידמפוטנטית
 * (הדגל pending יורד לפני השליחה).
 */

const SCHOOL_ID = "demo";

interface PendingMessage {
  path: string;
  type: string;
  title?: string;
  body: string;
  homework?: string;
  classes: string[];
  emails: string[];
  sendAt: string;
}

interface FsValue {
  stringValue?: string;
  booleanValue?: boolean;
  arrayValue?: { values?: { stringValue?: string }[] };
}

function str(f?: FsValue): string | undefined {
  return f?.stringValue;
}

function strArray(f?: FsValue): string[] {
  return (f?.arrayValue?.values ?? [])
    .map((v) => v.stringValue)
    .filter((v): v is string => Boolean(v));
}

async function pendingMessages(saToken: string): Promise<PendingMessage[]> {
  const res = await fetch(
    `${FIRESTORE}/schools/${SCHOOL_ID}:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "messages" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "pending" },
              op: "EQUAL",
              value: { booleanValue: true },
            },
          },
          limit: 50,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`runQuery: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as {
    document?: { name: string; fields: Record<string, FsValue> };
  }[];
  const now = new Date().toISOString();
  return rows
    .filter((r) => r.document)
    .map((r) => {
      const f = r.document!.fields;
      return {
        path: r.document!.name,
        type: str(f["type"]) ?? "reminder",
        title: str(f["title"]),
        body: str(f["body"]) ?? "",
        homework: str(f["homework"]),
        classes: strArray(f["classes"]),
        emails: strArray(f["emails"]),
        sendAt: str(f["sendAt"]) ?? now,
      };
    })
    .filter((m) => m.sendAt <= now);
}

/** סימון כנשלח — לפני השליחה עצמה, כדי שקריאה כפולה לא תשלח פעמיים */
async function markSent(saToken: string, path: string): Promise<boolean> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${path}?updateMask.fieldPaths=pending&updateMask.fieldPaths=sentAt&currentDocument.exists=true`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          pending: { booleanValue: false },
          sentAt: { stringValue: new Date().toISOString() },
        },
      }),
    },
  );
  return res.ok;
}

function audienceFor(
  message: PendingMessage,
  members: MemberInfo[],
): MemberInfo[] {
  if (message.emails.length > 0) {
    const wanted = new Set(message.emails.map((e) => e.toLowerCase()));
    return members.filter((m) => wanted.has(m.email.toLowerCase()));
  }
  if (message.classes.length > 0) {
    return members.filter((m) =>
      m.classes.some((c) => message.classes.includes(c)),
    );
  }
  return members;
}

function notificationTitle(message: PendingMessage): string {
  if (message.title?.trim()) return message.title.trim();
  if (message.type === "weekly") {
    return message.classes.length > 0
      ? `עדכון שבועי — כיתה ${message.classes[0]}`
      : "עדכון שבועי";
  }
  return "תזכורת מבית הספר";
}

async function dispatch(): Promise<Response> {
  try {
    const saToken = await serviceAccountToken();
    const due = await pendingMessages(saToken);
    if (due.length === 0) {
      return Response.json({ dispatched: 0, sent: 0 });
    }

    const members = await listMembers(saToken, SCHOOL_ID);
    let sent = 0;
    let dispatched = 0;

    for (const message of due) {
      // אם הסימון נכשל (כבר סומן במקביל) — מדלגים, בלי כפילויות
      if (!(await markSent(saToken, message.path))) continue;
      dispatched += 1;

      const tokens = await tokensForMembers(
        saToken,
        audienceFor(message, members),
      );
      const body =
        message.body.slice(0, 150) +
        (message.homework ? ` · שיעורי בית: ${message.homework.slice(0, 80)}` : "");
      const results = await Promise.all(
        tokens.map((t) =>
          sendToToken(saToken, t, notificationTitle(message), body),
        ),
      );
      sent += results.filter((r) => r === "sent").length;
    }

    return Response.json({ dispatched, sent });
  } catch (error) {
    console.error("[dispatch]", error);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}

// GET — ל-Vercel Cron; POST — ממסך הכתיבה אחרי יצירת הודעה
export async function GET() {
  return dispatch();
}

export async function POST() {
  return dispatch();
}
