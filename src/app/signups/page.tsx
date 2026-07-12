"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import type { Member, Signup, SignupEntry } from "@/lib/types";

const SCHOOL_ID = "demo";

/** מי נרשם למה — תצוגה חיה לרשימה פתוחה */
function SignupEntries({ signup }: { signup: Signup }) {
  const [entries, setEntries] = useState<(SignupEntry & { email: string })[]>(
    [],
  );

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "schools", SCHOOL_ID, "signups", signup.id, "entries"),
      (snap) =>
        setEntries(
          snap.docs.map((d) => ({ email: d.id, ...(d.data() as SignupEntry) })),
        ),
    );
  }, [signup.id]);

  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {signup.slots.map((slot) => {
        const slotEntries = entries.filter((e) => e.slotId === slot.id);
        const count = signup.counts?.[slot.id] ?? 0;
        return (
          <li key={slot.id} className="rounded-xl bg-surface p-2.5 text-sm ring-1 ring-ink/10">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-ink">{slot.label}</span>
              <span
                className={`text-xs ${count >= slot.max ? "text-green-700" : "text-ink/50"}`}
              >
                {count}/{slot.max}
                {count >= slot.max ? " · מלא ✓" : ""}
              </span>
            </div>
            {slotEntries.length > 0 && (
              <div className="mt-0.5 text-xs text-ink/60">
                {slotEntries.map((e) => e.name ?? e.email).join(", ")}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function SignupsPage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  // גם ועד ההורים — לאירועי כיתה ואישורי הגעה
  const staff = isStaff(member) || member?.role === "committee";

  const [members, setMembers] = useState<(Member & { email: string })[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [slotsText, setSlotsText] = useState("");
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
      .catch(() => {});
    return onSnapshot(
      collection(getDb(), "schools", SCHOOL_ID, "signups"),
      (snap) =>
        setSignups(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Signup)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
    );
  }, [staff]);

  const allClasses = useMemo(
    () =>
      [...new Set(members.flatMap((m) => m.classes ?? []))].sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
    [members],
  );

  /** שורת משבצת: "מגש פירות, 3" או "שתייה 4" */
  const slots = slotsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const match = line.match(/^(.*?)[,\s]+(\d+)$/);
      return {
        id: `s${i + 1}`,
        label: match ? match[1].trim() : line,
        max: match ? Math.max(1, parseInt(match[2], 10)) : 1,
      };
    });

  const valid = title.trim() && slots.length > 0;

  async function create() {
    if (!valid || !user?.email) return;
    setBusy(true);
    setStatus(null);
    try {
      await addDoc(collection(getDb(), "schools", SCHOOL_ID, "signups"), {
        title: title.trim(),
        classes: targetClasses,
        slots,
        counts: {},
        createdBy: user.email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });
      setTitle("");
      setSlotsText("");
      setTargetClasses([]);
      setStatus("הרשימה נוצרה 🎉 ההורים רואים אותה באזור האישי");
    } catch {
      setStatus("היצירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Signup) {
    if (!window.confirm(`למחוק את "${s.title}" וכל ההרשמות?`)) return;
    const entriesSnap = await getDocs(
      collection(getDb(), "schools", SCHOOL_ID, "signups", s.id, "entries"),
    );
    await Promise.all(entriesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(getDb(), "schools", SCHOOL_ID, "signups", s.id));
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
        <h1 className="mb-1 text-2xl font-medium text-ink">
          רשימות שיבוץ וכיבוד 🧺
        </h1>
        <p className="mb-4 text-sm text-ink/60">
          משבצות עם מכסות ("3 × מגש פירות") — הורים בוחרים משבצת, מלא ננעל
          אוטומטית. מתאים גם לאישורי הגעה.
        </p>

        {loading && <p className="text-ink/60">טוען…</p>}
        {!loading && (!user || !staff) && (
          <p className="text-ink/70">הדף הזה זמין רק לצוות ולוועד ההורים.</p>
        )}

        {staff && (
          <div className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='כותרת — למשל "כיבוד למסיבת חנוכה"'
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />

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
                      setTargetClasses(
                        targetClasses.includes(c)
                          ? targetClasses.filter((v) => v !== c)
                          : [...targetClasses, c],
                      )
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

            <textarea
              value={slotsText}
              onChange={(e) => setSlotsText(e.target.value)}
              rows={4}
              placeholder={"משבצת בכל שורה — פריט, כמות:\nמגש פירות, 3\nשתייה קלה, 4\nמפיות וכלים, 2"}
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />

            {slots.length > 0 && (
              <div className="text-xs text-ink/50">
                {slots.map((s) => `${s.label} ×${s.max}`).join(" · ")}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || !valid}
                onClick={create}
                className="rounded-full bg-brand-purple px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet disabled:opacity-50"
              >
                {busy ? "יוצר…" : "יצירת רשימה"}
              </button>
              {status && <span className="text-sm text-ink/70">{status}</span>}
            </div>
          </div>
        )}
      </div>

      {staff && signups.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {signups.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-ink/5"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  className="flex-1 text-right"
                >
                  <span className="font-medium text-ink">{s.title}</span>
                  <span className="ms-2 text-xs text-ink/50">
                    {s.classes.length > 0 ? s.classes.join(" ") : "כל בית הספר"}
                    {" · "}
                    {s.slots.length} משבצות
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  מחיקה
                </button>
              </div>
              {openId === s.id && <SignupEntries signup={s} />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
