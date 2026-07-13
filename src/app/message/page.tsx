"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import type { Member, MessageType } from "@/lib/types";

import { SCHOOL_ID } from "@/lib/config";

const TYPE_LABELS: Record<MessageType, { label: string; hint: string }> = {
  weekly: {
    label: "עדכון שבועי 📝",
    hint: "מה עשינו השבוע + שיעורי בית — להורי כיתה אחת",
  },
  reminder: {
    label: "תזכורת ⏰",
    hint: "לכיתות שתבחרו או לכולם — אפשר לתזמן מראש",
  },
  targeted: {
    label: "הודעה אישית 🎯",
    hint: "להורים מסומנים בלבד — 'לילד שלך חסר קלמר'",
  },
};

interface ParentRow extends Member {
  email: string;
}

export default function MessagePage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const staff = isStaff(member);

  const [type, setType] = useState<MessageType>("weekly");
  const [members, setMembers] = useState<ParentRow[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetEmails, setTargetEmails] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [homework, setHomework] = useState("");
  const [sendAtLocal, setSendAtLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!staff) return;
    getDocs(collection(getDb(), "schools", SCHOOL_ID, "members"))
      .then((snap) =>
        setMembers(
          snap.docs.map((d) => ({ email: d.id, ...(d.data() as Member) })),
        ),
      )
      .catch(() => setStatus("שגיאה בטעינת רשימת החברים"));
  }, [staff]);

  const allClasses = useMemo(
    () =>
      [...new Set(members.flatMap((m) => m.classes ?? []))].sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
    [members],
  );

  const classParents = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.role === "parent" &&
            selectedClass &&
            (m.classes ?? []).includes(selectedClass),
        )
        .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "he")),
    [members, selectedClass],
  );

  const valid =
    body.trim().length > 0 &&
    (type === "weekly"
      ? Boolean(selectedClass)
      : type === "targeted"
        ? targetEmails.length > 0
        : true);

  async function send() {
    if (!valid || !user?.email) return;
    setBusy(true);
    setStatus(null);
    try {
      const now = new Date();
      const sendAt =
        type === "reminder" && sendAtLocal
          ? new Date(sendAtLocal)
          : now;
      await addDoc(collection(getDb(), "schools", SCHOOL_ID, "messages"), {
        type,
        ...(title.trim() ? { title: title.trim() } : {}),
        body: body.trim(),
        ...(type === "weekly" && homework.trim()
          ? { homework: homework.trim() }
          : {}),
        classes:
          type === "weekly"
            ? [selectedClass]
            : type === "reminder"
              ? targetClasses
              : [],
        emails: type === "targeted" ? targetEmails : [],
        createdBy: user.email.toLowerCase(),
        createdAt: now.toISOString(),
        sendAt: sendAt.toISOString(),
        pending: true,
      });

      if (sendAt <= now) {
        const res = await fetch("/api/messages/dispatch", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        setStatus(
          res.ok
            ? `נשלח! הגיע ל-${data.sent ?? 0} מכשירים רשומים`
            : "ההודעה נשמרה, אבל שליחת ההתראות נכשלה",
        );
      } else {
        setStatus(
          `נשמר — יישלח ב-${sendAt.toLocaleString("he-IL", {
            dateStyle: "short",
            timeStyle: "short",
          })} (בסבב השליחה היומי)`,
        );
      }
      setTitle("");
      setBody("");
      setHomework("");
      setTargetEmails([]);
    } catch {
      setStatus("השמירה נכשלה — בדקו הרשאות");
    } finally {
      setBusy(false);
    }
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-brand-violet">
          → חזרה לדף הבית
        </Link>
        <Link
          href="/manage"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
        >
          ניהול
        </Link>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
        <h1 className="mb-4 text-2xl font-medium text-ink">הודעה להורים</h1>

        {loading && <p className="text-ink/60">טוען…</p>}

        {!loading && (!user || !staff) && (
          <p className="text-ink/70">
            הדף הזה זמין רק לצוות (ניהול או פרסום).
          </p>
        )}

        {staff && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(TYPE_LABELS) as MessageType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl p-3 text-right text-sm transition ring-1 ${
                    type === t
                      ? "bg-brand-purple/10 ring-brand-purple text-ink"
                      : "ring-ink/10 text-ink/70 hover:bg-surface"
                  }`}
                >
                  <div className="font-medium">{TYPE_LABELS[t].label}</div>
                  <div className="mt-0.5 text-xs text-ink/50">
                    {TYPE_LABELS[t].hint}
                  </div>
                </button>
              ))}
            </div>

            {(type === "weekly" || type === "targeted") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink/70">
                  כיתה
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setTargetEmails([]);
                  }}
                  className="rounded-xl bg-surface p-2.5 text-sm text-ink ring-1 ring-ink/10"
                >
                  <option value="">בחרו כיתה…</option>
                  {allClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {type === "targeted" && selectedClass && (
              <div>
                <div className="mb-1 text-sm font-medium text-ink/70">
                  למי? ({targetEmails.length} נבחרו)
                </div>
                {classParents.length === 0 && (
                  <p className="text-sm text-ink/50">
                    אין הורים רשומים לכיתה הזו.
                  </p>
                )}
                <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl bg-surface p-2 ring-1 ring-ink/10">
                  {classParents.map((p) => (
                    <li key={p.email}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm text-ink hover:bg-card">
                        <input
                          type="checkbox"
                          checked={targetEmails.includes(p.email)}
                          onChange={() =>
                            setTargetEmails(toggle(targetEmails, p.email))
                          }
                        />
                        <span>{p.name ?? p.email}</span>
                        <span className="text-xs text-ink/40" dir="ltr">
                          {p.email}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {type === "reminder" && (
              <>
                <div>
                  <div className="mb-1 text-sm font-medium text-ink/70">
                    לאילו כיתות? (ללא בחירה = כל בית הספר)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allClasses.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setTargetClasses(toggle(targetClasses, c))
                        }
                        className={`rounded-full px-3 py-1 text-sm transition ${
                          targetClasses.includes(c)
                            ? "bg-brand-purple text-white"
                            : "bg-surface text-ink/70 ring-1 ring-ink/10"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink/70">
                    מתי לשלוח? (ריק = עכשיו; עתידי נשלח בסבב היומי)
                  </label>
                  <input
                    type="datetime-local"
                    value={sendAtLocal}
                    onChange={(e) => setSendAtLocal(e.target.value)}
                    className="rounded-xl bg-surface p-2.5 text-sm text-ink ring-1 ring-ink/10"
                  />
                </div>
              </>
            )}

            {type !== "weekly" && (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="כותרת (אופציונלי)"
                className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              />
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={
                type === "weekly"
                  ? "מה היה לנו השבוע?"
                  : "תוכן ההודעה"
              }
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />

            {type === "weekly" && (
              <input
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="מה ניתן כשיעורי בית? (אופציונלי)"
                className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || !valid}
                onClick={send}
                className="rounded-full bg-brand-purple px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet disabled:opacity-50"
              >
                {busy ? "שולח…" : "שליחה"}
              </button>
              {status && <span className="text-sm text-ink/70">{status}</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
