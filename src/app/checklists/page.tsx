"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import type { Checklist, ChecklistMarks, Member } from "@/lib/types";

const SCHOOL_ID = "demo";

interface ParentRow extends Member {
  email: string;
}

/** מטריצת הסימונים של צ'קליסט פתוח — בזמן אמת, לשני הכיוונים */
function ChecklistMatrix({
  checklist,
  parents,
}: {
  checklist: Checklist;
  parents: ParentRow[];
}) {
  const [marks, setMarks] = useState<Record<string, ChecklistMarks>>({});

  useEffect(() => {
    return onSnapshot(
      collection(
        getDb(),
        "schools",
        SCHOOL_ID,
        "checklists",
        checklist.id,
        "marks",
      ),
      (snap) => {
        const next: Record<string, ChecklistMarks> = {};
        for (const d of snap.docs) next[d.id] = d.data() as ChecklistMarks;
        setMarks(next);
      },
    );
  }, [checklist.id]);

  async function toggleClass(email: string, itemId: string, checked: boolean) {
    await setDoc(
      doc(
        getDb(),
        "schools",
        SCHOOL_ID,
        "checklists",
        checklist.id,
        "marks",
        email,
      ),
      { classChecked: checked ? arrayUnion(itemId) : arrayRemove(itemId) },
      { merge: true },
    );
  }

  const nameOf = (email: string) =>
    parents.find((p) => p.email === email)?.name ?? email;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {checklist.emails.map((email) => {
        const m = marks[email] ?? {};
        return (
          <div key={email} className="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
            <div className="mb-1.5 text-sm font-medium text-ink">
              {nameOf(email)}
            </div>
            <ul className="flex flex-col gap-1">
              {checklist.items.map((item) => {
                const home = m.homeChecked?.includes(item.id) ?? false;
                const inClass = m.classChecked?.includes(item.id) ?? false;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={inClass}
                        onChange={(e) =>
                          toggleClass(email, item.id, e.target.checked)
                        }
                      />
                      <span className="text-xs text-ink/50">בכיתה</span>
                    </label>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        home
                          ? "bg-green-100 text-green-800"
                          : "bg-card text-ink/40"
                      }`}
                      title="סימון של ההורה"
                    >
                      {home ? "✓ בבית" : "בבית"}
                    </span>
                    <span>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function ChecklistsPage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const staff = isStaff(member);

  const [members, setMembers] = useState<ParentRow[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
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
      collection(getDb(), "schools", SCHOOL_ID, "checklists"),
      (snap) =>
        setChecklists(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Checklist)
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

  const classParents = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.role === "parent" &&
            selectedClass &&
            (m.classes ?? []).includes(selectedClass),
        )
        .sort((a, b) =>
          (a.name ?? a.email).localeCompare(b.name ?? b.email, "he"),
        ),
    [members, selectedClass],
  );

  const items = itemsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const valid = title.trim() && items.length > 0 && emails.length > 0;

  async function create() {
    if (!valid || !user?.email) return;
    setBusy(true);
    setStatus(null);
    try {
      await addDoc(collection(getDb(), "schools", SCHOOL_ID, "checklists"), {
        title: title.trim(),
        ...(selectedClass ? { classId: selectedClass } : {}),
        emails,
        items: items.map((text, i) => ({ id: `i${i + 1}`, text })),
        createdBy: user.email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });
      setTitle("");
      setItemsText("");
      setEmails([]);
      setStatus("הצ'קליסט נוצר 🎉 ההורים שנבחרו רואים אותו באזור האישי");
    } catch {
      setStatus("היצירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Checklist) {
    if (!window.confirm(`למחוק את "${c.title}"?`)) return;
    // מוחקים קודם את מסמכי הסימונים (מחיקת אב לא מוחקת תתי-מסמכים)
    const marksSnap = await getDocs(
      collection(getDb(), "schools", SCHOOL_ID, "checklists", c.id, "marks"),
    );
    await Promise.all(marksSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(getDb(), "schools", SCHOOL_ID, "checklists", c.id));
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
          צ'קליסטים במעקב 📋
        </h1>
        <p className="mb-4 text-sm text-ink/60">
          משימות במעקב אישי: ההורה מסמן בוצע-בבית, אתם מסמנים בוצע-בכיתה —
          ורואים זה את זה בזמן אמת. מתאים גם לתוכניות התערבות.
        </p>

        {loading && <p className="text-ink/60">טוען…</p>}
        {!loading && (!user || !staff) && (
          <p className="text-ink/70">הדף הזה זמין רק לצוות.</p>
        )}

        {staff && (
          <div className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='כותרת — למשל "שיעורי בית שבוע ל&quot;ג"'
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setEmails([]);
              }}
              className="rounded-xl bg-surface p-2.5 text-sm text-ink ring-1 ring-ink/10"
            >
              <option value="">בחרו כיתה…</option>
              {allClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {selectedClass && (
              <div>
                <div className="mb-1 text-sm font-medium text-ink/70">
                  תלמידים במעקב (לפי ההורה) — {emails.length} נבחרו
                </div>
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl bg-surface p-2 ring-1 ring-ink/10">
                  {classParents.map((p) => (
                    <li key={p.email}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm text-ink hover:bg-card">
                        <input
                          type="checkbox"
                          checked={emails.includes(p.email)}
                          onChange={() =>
                            setEmails(
                              emails.includes(p.email)
                                ? emails.filter((e) => e !== p.email)
                                : [...emails, p.email],
                            )
                          }
                        />
                        <span>{p.name ?? p.email}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={4}
              placeholder={"משימה בכל שורה, למשל:\nלקרוא 10 דקות\nדף חשבון עמ' 32\nלהחזיר ספר ספרייה"}
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || !valid}
                onClick={create}
                className="rounded-full bg-brand-purple px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet disabled:opacity-50"
              >
                {busy ? "יוצר…" : "יצירת צ'קליסט"}
              </button>
              {status && <span className="text-sm text-ink/70">{status}</span>}
            </div>
          </div>
        )}
      </div>

      {staff && checklists.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {checklists.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-ink/5"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className="flex-1 text-right"
                >
                  <span className="font-medium text-ink">{c.title}</span>
                  <span className="ms-2 text-xs text-ink/50">
                    {c.classId ? `כיתה ${c.classId} · ` : ""}
                    {c.emails.length} במעקב · {c.items.length} משימות
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  מחיקה
                </button>
              </div>
              {openId === c.id && (
                <ChecklistMatrix checklist={c} parents={members} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
