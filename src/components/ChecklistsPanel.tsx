"use client";

import { useEffect, useState } from "react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Checklist, ChecklistMarks } from "@/lib/types";

/** צ'קליסט אחד להורה — סימון "בוצע בבית" + תצוגת סימון המורה, בזמן אמת */
function ChecklistCard({
  schoolId,
  checklist,
  email,
}: {
  schoolId: string;
  checklist: Checklist;
  email: string;
}) {
  const [marks, setMarks] = useState<ChecklistMarks>({});

  const marksRef = doc(
    getDb(),
    "schools",
    schoolId,
    "checklists",
    checklist.id,
    "marks",
    email,
  );

  useEffect(() => {
    return onSnapshot(marksRef, (snap) => {
      setMarks(snap.exists() ? (snap.data() as ChecklistMarks) : {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, checklist.id, email]);

  async function toggleHome(itemId: string, checked: boolean) {
    await setDoc(
      marksRef,
      { homeChecked: checked ? arrayUnion(itemId) : arrayRemove(itemId) },
      { merge: true },
    );
  }

  return (
    <li className="rounded-xl bg-card/80 px-4 py-3 ring-1 ring-ink/5">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-medium text-ink">{checklist.title}</span>
        {checklist.classId && (
          <span className="text-xs text-ink/40">כיתה {checklist.classId}</span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {checklist.items.map((item) => {
          const home = marks.homeChecked?.includes(item.id) ?? false;
          const inClass = marks.classChecked?.includes(item.id) ?? false;
          return (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={home}
                  onChange={(e) => toggleHome(item.id, e.target.checked)}
                />
                <span className={home ? "text-ink/50 line-through" : "text-ink"}>
                  {item.text}
                </span>
              </label>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  inClass
                    ? "bg-green-100 text-green-800"
                    : "bg-surface text-ink/40"
                }`}
                title="סימון של המורה"
              >
                {inClass ? "✓ בכיתה" : "בכיתה"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink/40">
        🏠 אתם מסמנים "בוצע בבית" — והמורה רואה; ✓ בכיתה = סימון של המורה.
      </p>
    </li>
  );
}

/** המשימות במעקב של ההורה המחובר — בזמן אמת */
export function ChecklistsPanel({
  schoolId,
  email,
}: {
  schoolId: string;
  email: string;
}) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(getDb(), "schools", schoolId, "checklists"),
        where("emails", "array-contains", email),
      ),
      (snap) => {
        setChecklists(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Checklist)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      () => setChecklists([]),
    );
  }, [schoolId, email]);

  if (checklists.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-brand-violet">
        משימות במעקב 📋
      </h3>
      <ul className="flex flex-col gap-2">
        {checklists.map((c) => (
          <ChecklistCard
            key={c.id}
            schoolId={schoolId}
            checklist={c}
            email={email}
          />
        ))}
      </ul>
    </div>
  );
}
