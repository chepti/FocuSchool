"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Signup, SignupEntry } from "@/lib/types";

interface EntryRow extends SignupEntry {
  email: string;
}

/** רשימת שיבוץ אחת — משבצות עם מכסות, הרשמה בטרנזקציה, רואים מי מביא מה */
function SignupCard({
  schoolId,
  signup,
  email,
  displayName,
}: {
  schoolId: string;
  signup: Signup;
  email: string;
  displayName: string;
}) {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = getDb();
  const signupRef = doc(db, "schools", schoolId, "signups", signup.id);

  useEffect(() => {
    return onSnapshot(collection(signupRef, "entries"), (snap) => {
      setEntries(
        snap.docs.map(
          (d) => ({ email: d.id, ...(d.data() as SignupEntry) }),
        ),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, signup.id]);

  const myEntry = entries.find((e) => e.email === email);

  /** הרשמה/ביטול/החלפה — הכול בטרנזקציה כדי שמשבצת מלאה תינעל בלי דריסות */
  async function choose(slotId: string) {
    setBusy(true);
    setError(null);
    try {
      await runTransaction(db, async (tx) => {
        const entryRef = doc(signupRef, "entries", email);
        const [signupSnap, entrySnap] = await Promise.all([
          tx.get(signupRef),
          tx.get(entryRef),
        ]);
        if (!signupSnap.exists()) throw new Error("הרשימה נמחקה");
        const counts = { ...(signupSnap.data().counts ?? {}) } as Record<
          string,
          number
        >;
        const current = entrySnap.exists()
          ? (entrySnap.data() as SignupEntry).slotId
          : null;

        if (current === slotId) {
          // לחיצה על המשבצת הנוכחית = ביטול
          counts[slotId] = Math.max(0, (counts[slotId] ?? 1) - 1);
          tx.delete(entryRef);
        } else {
          const slot = signup.slots.find((s) => s.id === slotId);
          if (!slot) throw new Error("משבצת לא קיימת");
          if ((counts[slotId] ?? 0) >= slot.max) {
            throw new Error("המשבצת הזו כבר מלאה 🔒");
          }
          if (current) counts[current] = Math.max(0, (counts[current] ?? 1) - 1);
          counts[slotId] = (counts[slotId] ?? 0) + 1;
          tx.set(entryRef, {
            slotId,
            name: displayName,
            at: new Date().toISOString(),
          });
        }
        tx.update(signupRef, { counts });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "משהו השתבש — נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl bg-card/80 px-4 py-3 ring-1 ring-ink/5">
      <div className="mb-2 font-medium text-ink">{signup.title}</div>
      <ul className="flex flex-col gap-2">
        {signup.slots.map((slot) => {
          const count = signup.counts?.[slot.id] ?? 0;
          const full = count >= slot.max;
          const mine = myEntry?.slotId === slot.id;
          const names = entries
            .filter((e) => e.slotId === slot.id)
            .map((e) => e.name ?? e.email);
          return (
            <li
              key={slot.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <button
                type="button"
                disabled={busy || (full && !mine)}
                onClick={() => choose(slot.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
                  mine
                    ? "bg-brand-purple text-white"
                    : full
                      ? "bg-surface text-ink/40 ring-1 ring-ink/10"
                      : "bg-brand-pink/10 text-brand-pink ring-1 ring-brand-pink/30 hover:bg-brand-pink hover:text-white"
                }`}
              >
                {mine ? "אני מביא/ה ✓ (לביטול)" : full ? "מלא 🔒" : "אני אביא ✋"}
              </button>
              <span className="font-medium text-ink">{slot.label}</span>
              <span className="text-xs text-ink/50">
                {count}/{slot.max}
              </span>
              {names.length > 0 && (
                <span className="text-xs text-ink/50">— {names.join(", ")}</span>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </li>
  );
}

/** רשימות שיבוץ/כיבוד הרלוונטיות להורה — לפי הכיתות שלו */
export function SignupsPanel({
  schoolId,
  email,
  displayName,
  classes,
}: {
  schoolId: string;
  email: string;
  displayName: string;
  classes: string[];
}) {
  const [signups, setSignups] = useState<Signup[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "schools", schoolId, "signups"),
      (snap) => {
        setSignups(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Signup)
            .filter(
              (s) =>
                s.classes.length === 0 ||
                s.classes.some((c) => classes.includes(c)),
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      () => setSignups([]),
    );
  }, [schoolId, classes]);

  if (signups.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-brand-violet">
        מתנדבים ומביאים 🧺
      </h3>
      <ul className="flex flex-col gap-2">
        {signups.map((s) => (
          <SignupCard
            key={s.id}
            schoolId={schoolId}
            signup={s}
            email={email}
            displayName={displayName}
          />
        ))}
      </ul>
    </div>
  );
}
