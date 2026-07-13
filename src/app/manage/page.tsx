"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import type { DigestPref, Inquiry, StripItem } from "@/lib/types";

import { SCHOOL_ID } from "@/lib/config";

interface PendingItem extends StripItem {
  stripId: string;
  stripTitle: string;
}

export default function ManagePage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [digest, setDigest] = useState<DigestPref>("immediate");

  const staff = isStaff(member);
  const myEmail = user?.email?.toLowerCase();

  useEffect(() => {
    if (member?.digest) setDigest(member.digest);
  }, [member]);

  // פניות אליי — בזמן אמת (המיון בצד הלקוח, בלי אינדקס מורכב)
  useEffect(() => {
    if (!myEmail) return;
    return onSnapshot(
      query(
        collection(getDb(), "schools", SCHOOL_ID, "inquiries"),
        where("toEmail", "==", myEmail),
      ),
      (snap) =>
        setInquiries(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Inquiry)
            .filter((i) => !i.done)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      () => setInquiries([]),
    );
  }, [myEmail]);

  async function saveDigest(pref: DigestPref) {
    if (!myEmail) return;
    setDigest(pref);
    await setDoc(
      doc(getDb(), "schools", SCHOOL_ID, "members", myEmail),
      { digest: pref },
      { merge: true },
    ).catch(() => {});
  }

  async function markDone(inquiry: Inquiry) {
    await updateDoc(
      doc(getDb(), "schools", SCHOOL_ID, "inquiries", inquiry.id),
      { done: true },
    ).catch(() => {});
  }

  async function sendPush() {
    if (!user || !pushTitle.trim()) return;
    setPushBusy(true);
    setPushStatus(null);
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: pushTitle, body: pushBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushStatus(`שגיאה: ${data.error ?? res.status}`);
      } else if (data.devices === 0) {
        setPushStatus("אין עדיין מכשירים רשומים — הירשמו קודם דרך דף הבית");
      } else {
        setPushStatus(
          `נשלח ל-${data.sent} מתוך ${data.devices} מכשירים` +
            (data.failed ? ` (${data.failed} נכשלו)` : ""),
        );
        setPushTitle("");
        setPushBody("");
      }
    } catch {
      setPushStatus("שגיאה בשליחה");
    } finally {
      setPushBusy(false);
    }
  }

  const load = useCallback(async () => {
    const db = getDb();
    const stripsSnap = await getDocs(
      collection(db, "schools", SCHOOL_ID, "strips"),
    );
    const pending: PendingItem[] = [];
    for (const stripDoc of stripsSnap.docs) {
      const itemsSnap = await getDocs(
        query(
          collection(stripDoc.ref, "items"),
          where("status", "==", "pending"),
        ),
      );
      for (const itemDoc of itemsSnap.docs) {
        pending.push({
          id: itemDoc.id,
          stripId: stripDoc.id,
          stripTitle: (stripDoc.data().title as string) ?? stripDoc.id,
          ...(itemDoc.data() as Omit<StripItem, "id">),
        });
      }
    }
    setItems(pending);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (staff) load();
  }, [staff, load]);

  async function act(item: PendingItem, action: "approve" | "reject") {
    setBusy(item.id);
    const ref = doc(
      getDb(),
      "schools",
      SCHOOL_ID,
      "strips",
      item.stripId,
      "items",
      item.id,
    );
    try {
      if (action === "approve") {
        await updateDoc(ref, { status: "published" });
      } else {
        await deleteDoc(ref);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-brand-violet">
          → חזרה לדף הבית
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          {staff && (
            <>
              <Link
                href="/message"
                className="rounded-full bg-brand-purple px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet"
              >
                ✍️ הודעה להורים
              </Link>
              <Link
                href="/checklists"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
              >
                📋 צ'קליסטים
              </Link>
              <Link
                href="/signups"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
              >
                🧺 שיבוצים
              </Link>
            </>
          )}
          {member?.role === "admin" && (
            <>
              <Link
                href="/committee"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
              >
                🤝 ועד
              </Link>
              <Link
                href="/members"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
              >
                ניהול חברים
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
        <h1 className="mb-4 text-2xl font-medium text-ink">
          פריטים ממתינים לאישור
        </h1>

        {loading && <p className="text-ink/60">טוען…</p>}

        {!loading && (!user || !staff) && (
          <p className="text-ink/70">
            הדף הזה זמין רק לבעלי הרשאת ניהול או פרסום.
          </p>
        )}

        {staff && loaded && items.length === 0 && (
          <p className="text-ink/60">
            אין פריטים ממתינים — הכול מאושר. 🎉
          </p>
        )}

        {staff && (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-surface p-4 ring-1 ring-ink/10"
              >
                <div className="mb-1 text-xs font-medium text-brand-violet">
                  {item.stripTitle}
                  {item.createdBy ? ` · נשלח ע״י ${item.createdBy}` : ""}
                </div>
                <div className="font-medium text-ink">
                  {item.emoji ? `${item.emoji} ` : ""}
                  {item.title}
                </div>
                {item.body && (
                  <p className="mt-1 text-sm text-ink/70">{item.body}</p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1 block truncate text-sm text-brand-blue underline"
                  >
                    {item.url}
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => act(item, "approve")}
                    className="rounded-full bg-brand-purple px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    אישור ופרסום
                  </button>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => act(item, "reject")}
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-red-700 ring-1 ring-red-300 disabled:opacity-50"
                  >
                    דחייה ומחיקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {staff && (
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
          <h2 className="mb-1 text-xl font-medium text-ink">
            שליחת נוטיפיקציה 🔔
          </h2>
          <p className="mb-4 text-sm text-ink/60">
            נשלחת לכל המכשירים שנרשמו לעדכונים (כפתור 🔔 בדף הבית).
          </p>
          <div className="flex flex-col gap-2">
            <input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="כותרת (חובה)"
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />
            <input
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="תוכן ההודעה"
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pushBusy || !pushTitle.trim()}
                onClick={sendPush}
                className="rounded-full bg-brand-pink px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-purple disabled:opacity-50"
              >
                {pushBusy ? "שולח…" : "שליחה לכולם"}
              </button>
              {pushStatus && (
                <span className="text-sm text-ink/70">{pushStatus}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {staff && (
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-medium text-ink">
              פניות אליי ✉️
              {inquiries.length > 0 && (
                <span className="ms-2 rounded-full bg-brand-pink/10 px-2 py-0.5 text-sm text-brand-pink">
                  {inquiries.length}
                </span>
              )}
            </h2>
            <label className="flex items-center gap-2 text-xs text-ink/60">
              התראות על פניות:
              <select
                value={digest}
                onChange={(e) => saveDigest(e.target.value as DigestPref)}
                className="rounded-lg bg-surface p-1.5 text-xs text-ink ring-1 ring-ink/10"
              >
                <option value="immediate">מיידי</option>
                <option value="daily">סיכום יומי</option>
                <option value="weekly">סיכום שבועי</option>
              </select>
            </label>
          </div>

          {inquiries.length === 0 ? (
            <p className="text-sm text-ink/60">אין פניות פתוחות. 🎉</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {inquiries.map((i) => (
                <li
                  key={i.id}
                  className="rounded-xl bg-surface p-3 ring-1 ring-ink/10"
                >
                  <div className="mb-1 flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-brand-violet">
                      {i.fromName ?? i.fromEmail}
                    </span>
                    <span className="text-ink/40" dir="ltr">
                      {i.fromEmail}
                    </span>
                    <span className="text-ink/40">
                      {new Date(i.createdAt).toLocaleDateString("he-IL", {
                        day: "numeric",
                        month: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-ink/80">
                    {i.body}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`mailto:${i.fromEmail}`}
                      className="rounded-full px-3 py-1 text-xs font-medium text-brand-violet ring-1 ring-brand-violet/30 hover:bg-brand-purple/10"
                    >
                      תשובה במייל
                    </a>
                    <button
                      type="button"
                      onClick={() => markDone(i)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-300 hover:bg-green-50"
                    >
                      טופל ✓
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
