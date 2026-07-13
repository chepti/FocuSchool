import {
  callerEmail,
  isStaffEmail,
  listMembers,
  sendToToken,
  serviceAccountToken,
  tokensForMembers,
} from "@/lib/push-server";
import { SCHOOL_ID } from "@/lib/config";

/**
 * שליחת נוטיפיקציית בדיקה לכל המכשירים הרשומים — לצוות בלבד
 * (הודעות אמיתיות נשלחות דרך messages + /api/messages/dispatch).
 */
export async function POST(request: Request) {
  const idToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, body, schoolId = SCHOOL_ID } = (await request.json()) as {
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
    if (!email || !(await isStaffEmail(saToken, schoolId, email))) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const members = await listMembers(saToken, schoolId);
    const tokens = await tokensForMembers(saToken, members);
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
