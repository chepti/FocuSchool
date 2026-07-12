"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import type { StripItem } from "@/lib/types";

const SCHOOL_ID = "demo";

interface PendingItem extends StripItem {
  stripId: string;
  stripTitle: string;
}

export default function ManagePage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const staff = isStaff(member);

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
        {member?.role === "admin" && (
          <Link
            href="/members"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
          >
            ניהול חברים
          </Link>
        )}
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
    </main>
  );
}
