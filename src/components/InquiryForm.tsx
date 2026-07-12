"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { StaffMember } from "@/lib/types";

/**
 * פנייה לצוות — נשמרת ב-inquiries; ההתראה לנמען נשלחת לפי העדפת ה-digest
 * שלו (מיידי דרך ה-dispatch שנקרא כאן, יומי/שבועי דרך ה-Cron).
 */
export function InquiryForm({
  schoolId,
  email,
  displayName,
}: {
  schoolId: string;
  email: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<StaffMember[]>([]);
  const [toEmail, setToEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open || recipients.length > 0) return;
    getDocs(collection(getDb(), "schools", schoolId, "staff"))
      .then((snap) => {
        const withEmail = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as StaffMember)
          .filter((s) => s.email);
        setRecipients(withEmail);
        if (withEmail.length > 0) setToEmail(withEmail[0].email!);
      })
      .catch(() => {});
  }, [open, recipients.length, schoolId]);

  async function send() {
    if (!body.trim() || !toEmail) return;
    setBusy(true);
    setStatus(null);
    try {
      await addDoc(collection(getDb(), "schools", schoolId, "inquiries"), {
        toEmail: toEmail.toLowerCase(),
        fromEmail: email,
        fromName: displayName,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        notified: false,
      });
      // התראה מיידית לנמענים שבחרו בכך — הפנייה עצמה כבר שמורה
      fetch("/api/messages/dispatch", { method: "POST" }).catch(() => {});
      setBody("");
      setStatus("הפנייה נשלחה 🎉 הצוות יראה אותה ויחזור אליכם");
    } catch {
      setStatus("השליחה נכשלה — נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/30 transition hover:bg-brand-purple/10"
      >
        ✉️ פנייה לצוות
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-card/80 p-4 ring-1 ring-ink/5">
          {recipients.length === 0 ? (
            <p className="text-sm text-ink/60">
              אין כרגע אנשי צוות זמינים לפנייה.
            </p>
          ) : (
            <>
              <select
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="rounded-xl bg-surface p-2.5 text-sm text-ink ring-1 ring-ink/10"
              >
                {recipients.map((r) => (
                  <option key={r.id} value={r.email}>
                    {r.name}
                    {r.subjects.length > 0 ? ` · ${r.subjects.join(", ")}` : ""}
                  </option>
                ))}
              </select>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="מה תרצו לשאול או לספר?"
                className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy || !body.trim()}
                  onClick={send}
                  className="rounded-full bg-brand-purple px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-violet disabled:opacity-50"
                >
                  {busy ? "שולח…" : "שליחה"}
                </button>
                {status && (
                  <span className="text-xs text-ink/60">{status}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
