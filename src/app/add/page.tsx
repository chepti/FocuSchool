"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase";
import type { StripType } from "@/lib/types";

import { SCHOOL_ID } from "@/lib/config";

const GRADIENTS = [
  "from-brand-pink to-brand-purple",
  "from-brand-purple to-brand-blue",
  "from-brand-blue to-brand-violet",
  "from-brand-violet to-brand-pink",
  "from-brand-magenta to-brand-pink",
];

const TYPE_LABELS: Record<StripType, string> = {
  posts: "פוסט",
  files: "קובץ",
  photos: "תמונה",
  links: "קישור",
};

interface StripOption {
  id: string;
  type: StripType;
  title: string;
}

export default function AddItemPage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const [strips, setStrips] = useState<StripOption[]>([]);
  const [stripId, setStripId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [emoji, setEmoji] = useState("📌");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"published" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(
      query(collection(getDb(), "schools", SCHOOL_ID, "strips"), orderBy("order")),
    )
      .then((snap) => {
        const options = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as StripOption,
        );
        setStrips(options);
        if (options.length > 0) setStripId((prev) => prev || options[0].id);
      })
      .catch(() => setError("לא הצלחנו לטעון את הרצועות"));
  }, []);

  const strip = strips.find((s) => s.id === stripId);
  const needsUrl = strip?.type === "files" || strip?.type === "links";
  const needsBody = strip?.type === "posts";
  const needsEmoji = strip?.type !== "files";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!strip || !member) return;
    setSaving(true);
    setError(null);
    try {
      const status = isStaff(member) ? "published" : "pending";
      const item: Record<string, unknown> = {
        status,
        title: title.trim(),
        date: new Date().toLocaleDateString("en-CA"),
        createdBy: user?.email ?? "",
      };
      if (needsBody && body.trim()) item.body = body.trim();
      if (needsUrl) item.url = url.trim();
      if (needsEmoji) item.emoji = emoji || "📌";
      if (strip.type === "posts" || strip.type === "photos") {
        item.gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
      }
      await addDoc(
        collection(getDb(), "schools", SCHOOL_ID, "strips", strip.id, "items"),
        item,
      );
      setResult(status);
      setTitle("");
      setBody("");
      setUrl("");
    } catch {
      setError("השמירה נכשלה — נסו שוב");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageShell>טוען…</PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <p className="mb-4 text-ink/70">כדי להוסיף תוכן צריך להתחבר.</p>
        <button
          type="button"
          onClick={() =>
            signInWithPopup(getAuthClient(), new GoogleAuthProvider())
          }
          className="rounded-full bg-brand-purple px-6 py-3 font-medium text-white shadow-sm"
        >
          התחברות עם גוגל
        </button>
      </PageShell>
    );
  }

  if (!member) {
    return (
      <PageShell>
        <p className="text-ink/70">
          החשבון {user.email} אינו מופיע ברשימת המורשים של בית הספר.
          פנו למנהל האתר כדי לקבל הרשאה.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-1 text-2xl font-medium text-ink">הוספת פריט</h1>
      <p className="mb-6 text-sm text-ink/60">
        {isStaff(member)
          ? "יש לך הרשאת פרסום — הפריט יעלה מיד."
          : "הפריט יישלח לאישור לפני הפרסום."}
      </p>

      {result && (
        <div className="mb-6 rounded-2xl bg-brand-purple/10 p-4 font-medium text-brand-violet">
          {result === "published"
            ? "🎉 הפריט פורסם! אפשר להוסיף עוד אחד."
            : "✅ הפריט נשלח וממתין לאישור. אפשר להוסיף עוד אחד."}
          {" "}
          <Link href="/" className="underline">
            לדף הבית
          </Link>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">לאיזו רצועה?</span>
          <div className="flex flex-wrap gap-2">
            {strips.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStripId(s.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  s.id === stripId
                    ? "bg-brand-purple text-white"
                    : "bg-card text-ink/70 ring-1 ring-ink/10"
                }`}
              >
                {TYPE_LABELS[s.type]} · {s.title}
              </button>
            ))}
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">כותרת</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="למשל: יום ספורט שכבתי"
            className="rounded-xl border border-ink/15 bg-card p-3 outline-none focus:border-brand-purple"
          />
        </label>

        {needsBody && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">מה מספרים?</span>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="כמה משפטים על מה שהיה…"
              className="rounded-xl border border-ink/15 bg-card p-3 outline-none focus:border-brand-purple"
            />
          </label>
        )}

        {needsUrl && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">קישור</span>
            <input
              required
              type="url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="rounded-xl border border-ink/15 bg-card p-3 text-left outline-none focus:border-brand-purple"
            />
          </label>
        )}

        {needsEmoji && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">אימוג׳י</span>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="w-24 rounded-xl border border-ink/15 bg-card p-3 text-center text-2xl outline-none focus:border-brand-purple"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !strip}
          className="mt-2 rounded-full bg-brand-pink px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-purple disabled:opacity-50"
        >
          {saving
            ? "שומר…"
            : isStaff(member)
              ? "פרסום"
              : "שליחה לאישור"}
        </button>
      </form>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-brand-violet">
        → חזרה לדף הבית
      </Link>
      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
        {children}
      </div>
    </main>
  );
}
