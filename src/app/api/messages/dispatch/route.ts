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

interface PendingInquiry {
  path: string;
  toEmail: string;
  fromName?: string;
  body: string;
}

async function pendingInquiries(saToken: string): Promise<PendingInquiry[]> {
  const res = await fetch(`${FIRESTORE}/schools/${SCHOOL_ID}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${saToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "inquiries" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "notified" },
            op: "EQUAL",
            value: { booleanValue: false },
          },
        },
        limit: 100,
      },
    }),
  });
  if (!res.ok) throw new Error(`inquiries query: ${res.status}`);
  const rows = (await res.json()) as {
    document?: { name: string; fields: Record<string, FsValue> };
  }[];
  return rows
    .filter((r) => r.document)
    .map((r) => {
      const f = r.document!.fields;
      return {
        path: r.document!.name,
        toEmail: (str(f["toEmail"]) ?? "").toLowerCase(),
        fromName: str(f["fromName"]),
        body: str(f["body"]) ?? "",
      };
    });
}

async function markNotified(saToken: string, path: string): Promise<void> {
  await fetch(
    `https://firestore.googleapis.com/v1/${path}?updateMask.fieldPaths=notified`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: { notified: { booleanValue: true } } }),
    },
  ).catch(() => {});
}

/**
 * התראות על פניות לפי העדפת הנמען: immediate — בכל קריאה;
 * daily — רק בסבב היומי (cron); weekly — רק בסבב היומי של יום ראשון.
 * לכל נמען נשלחת התראה אחת מרוכזת ("N פניות ממתינות").
 */
async function dispatchInquiries(
  saToken: string,
  members: MemberInfo[],
  isCron: boolean,
): Promise<number> {
  const due = await pendingInquiries(saToken);
  if (due.length === 0) return 0;

  const isSunday = new Date().getUTCDay() === 0;
  const byRecipient = new Map<string, PendingInquiry[]>();
  for (const inquiry of due) {
    byRecipient.set(inquiry.toEmail, [
      ...(byRecipient.get(inquiry.toEmail) ?? []),
      inquiry,
    ]);
  }

  let sent = 0;
  for (const [toEmail, inquiries] of byRecipient) {
    const recipient = members.find((m) => m.email.toLowerCase() === toEmail);
    // נמען שאינו חבר — מסמנים כדי שלא יצטבר; הפנייה עדיין גלויה באתר
    const pref = recipient?.digest ?? "immediate";
    const shouldSend =
      pref === "immediate" ||
      (isCron && (pref === "daily" || (pref === "weekly" && isSunday)));
    if (!shouldSend) continue;

    await Promise.all(inquiries.map((i) => markNotified(saToken, i.path)));

    if (recipient) {
      const tokens = await tokensForMembers(saToken, [recipient]);
      const title =
        inquiries.length === 1
          ? `פנייה חדשה${inquiries[0].fromName ? ` מ${inquiries[0].fromName}` : ""} ✉️`
          : `${inquiries.length} פניות ממתינות לך ✉️`;
      const body =
        inquiries.length === 1
          ? inquiries[0].body.slice(0, 150)
          : "היכנסו למסך הניהול כדי לקרוא ולהשיב";
      const results = await Promise.all(
        tokens.map((t) => sendToToken(saToken, t, title, body)),
      );
      sent += results.filter((r) => r === "sent").length;
    }
  }
  return sent;
}

async function dispatch(isCron: boolean): Promise<Response> {
  try {
    const saToken = await serviceAccountToken();
    const [due, members] = await Promise.all([
      pendingMessages(saToken),
      listMembers(saToken, SCHOOL_ID),
    ]);
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

    const inquiriesSent = await dispatchInquiries(saToken, members, isCron);

    return Response.json({ dispatched, sent, inquiriesSent });
  } catch (error) {
    console.error("[dispatch]", error);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}

// GET — ל-Vercel Cron (כולל סיכומים יומיים/שבועיים);
// POST — ממסכי הכתיבה/הפנייה (מיידי בלבד)
export async function GET() {
  return dispatch(true);
}

export async function POST() {
  return dispatch(false);
}
