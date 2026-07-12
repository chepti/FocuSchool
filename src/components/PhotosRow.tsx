"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useMember } from "@/lib/useMember";
import type { StripItem } from "@/lib/types";

function PhotoFrame({ item }: { item: StripItem }) {
  return (
    <div
      className={`flex h-44 items-center justify-center rounded-2xl bg-gradient-to-bl ${item.gradient} text-6xl shadow-sm`}
    >
      <span aria-hidden>{item.emoji}</span>
    </div>
  );
}

/**
 * כרטיסי רצועת תמונות. להורה מחובר (או כל חבר קהילה) נשלף קישור האלבום
 * מ-items/{id}/private/parents — ואז הכרטיס נהיה קליקבילי עם 🔒 שנפתח.
 */
export function PhotosRow({
  stripId,
  items,
  schoolId = "demo",
}: {
  stripId: string;
  items: StripItem[];
  schoolId?: string;
}) {
  const { member } = useMember(schoolId);
  const [albums, setAlbums] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!member) return;
    const db = getDb();
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        items.map(async (item) => {
          try {
            const snap = await getDoc(
              doc(
                db,
                "schools",
                schoolId,
                "strips",
                stripId,
                "items",
                item.id,
                "private",
                "parents",
              ),
            );
            const albumUrl = snap.exists()
              ? (snap.data().albumUrl as string | undefined)
              : undefined;
            return albumUrl ? ([item.id, albumUrl] as const) : null;
          } catch {
            return null; // אין הרשאה — הכרטיס נשאר בלי קישור
          }
        }),
      );
      if (!cancelled) {
        setAlbums(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [member, items, stripId, schoolId]);

  return (
    <>
      {items.map((item) => {
        const albumUrl = albums[item.id];
        return (
          <figure key={item.id} className="w-64 shrink-0">
            {albumUrl ? (
              <a
                href={albumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block transition hover:-translate-y-0.5"
                title="פתיחת האלבום (להורי בית הספר)"
              >
                <PhotoFrame item={item} />
                <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-1 text-sm shadow-sm">
                  🔓
                </span>
              </a>
            ) : (
              <PhotoFrame item={item} />
            )}
            <figcaption className="mt-2 px-1 text-sm font-medium text-ink/80">
              {item.title}
              {albumUrl && (
                <span className="ms-1 text-xs text-brand-purple">· לאלבום</span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </>
  );
}
