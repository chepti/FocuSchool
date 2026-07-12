"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useMember } from "@/lib/useMember";
import type { Member, MemberRole } from "@/lib/types";

const SCHOOL_ID = "demo";

const ROLE_LABELS: Record<string, string> = {
  admin: "ניהול",
  publisher: "פרסום",
  contributor: "תורם תוכן",
  parent: "הורה",
};

interface MemberRow extends Member {
  email: string;
}

interface ParsedRow {
  name: string;
  email: string;
  classes: string[];
  phone: string;
  exists: boolean;
}

interface BadRow {
  line: string;
  reason: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * פענוח שורה בפורמט: שם, מייל, כיתות (מופרדות ברווח), טלפון
 * תומך גם בהדבקה מאקסל (מפריד TAB).
 */
function parseLine(line: string): Omit<ParsedRow, "exists"> | string {
  const parts = (line.includes("\t") ? line.split("\t") : line.split(","))
    .map((p) => p.trim());
  if (parts.length < 2) return "צריך לפחות שם ומייל";
  const [name, email, classesRaw = "", phone = ""] = parts;
  if (!name) return "חסר שם";
  if (!EMAIL_RE.test(email)) return "כתובת מייל לא תקינה";
  const classes = classesRaw.split(/\s+/).filter(Boolean);
  return { name, email: email.toLowerCase(), classes, phone };
}

export default function MembersPage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const isAdmin = member?.role === "admin";

  const [existing, setExisting] = useState<MemberRow[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    classes: "",
    phone: "",
    role: "parent" as MemberRole,
  });
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const myEmail = user?.email?.toLowerCase();

  function startEdit(m: MemberRow) {
    setEditing(m.email);
    setEditForm({
      name: m.name ?? "",
      classes: m.classes?.join(" ") ?? "",
      phone: m.phone ?? "",
      role: m.role,
    });
  }

  async function saveEdit(email: string) {
    setRowBusy(email);
    setError(null);
    try {
      const isSelf = email === myEmail;
      const current = existing.find((m) => m.email === email);
      await setDoc(doc(getDb(), "schools", SCHOOL_ID, "members", email), {
        // אי אפשר להוריד לעצמך את ההרשאה — נשמר התפקיד הנוכחי
        role: isSelf ? (current?.role ?? "admin") : editForm.role,
        name: editForm.name.trim(),
        classes: editForm.classes.split(/\s+/).filter(Boolean),
        ...(editForm.phone.trim() ? { phone: editForm.phone.trim() } : {}),
      });
      setEditing(null);
      await load();
    } catch {
      setError("העדכון נכשל");
    } finally {
      setRowBusy(null);
    }
  }

  async function removeMember(m: MemberRow) {
    if (
      !window.confirm(
        `למחוק את ${m.name ?? m.email} מרשימת החברים? ההרשאות שלו יבוטלו.`,
      )
    ) {
      return;
    }
    setRowBusy(m.email);
    setError(null);
    try {
      await deleteDoc(doc(getDb(), "schools", SCHOOL_ID, "members", m.email));
      await load();
    } catch {
      setError("המחיקה נכשלה");
    } finally {
      setRowBusy(null);
    }
  }

  const load = useCallback(async () => {
    const snap = await getDocs(
      collection(getDb(), "schools", SCHOOL_ID, "members"),
    );
    const rows = snap.docs
      .map((d) => ({ email: d.id, ...(d.data() as Member) }))
      .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "he"));
    setExisting(rows);
  }, []);

  useEffect(() => {
    if (isAdmin) load().catch(() => setError("שגיאה בטעינת רשימת החברים"));
  }, [isAdmin, load]);

  const existingEmails = useMemo(
    () => new Set(existing.map((m) => m.email)),
    [existing],
  );

  const { parsed, bad } = useMemo(() => {
    const parsed: ParsedRow[] = [];
    const bad: BadRow[] = [];
    const seen = new Set<string>();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const result = parseLine(trimmed);
      if (typeof result === "string") {
        bad.push({ line: trimmed, reason: result });
      } else if (seen.has(result.email)) {
        bad.push({ line: trimmed, reason: "מייל כפול ברשימה" });
      } else {
        seen.add(result.email);
        parsed.push({ ...result, exists: existingEmails.has(result.email) });
      }
    }
    return { parsed, bad };
  }, [text, existingEmails]);

  const toSave = parsed.filter((r) => !r.exists);

  async function save() {
    if (toSave.length === 0) return;
    setSaving(true);
    setError(null);
    setSavedCount(null);
    try {
      const db = getDb();
      const batch = writeBatch(db);
      for (const row of toSave) {
        // מיילים קיימים דולגו — כך לעולם לא דורסים admin/publisher
        batch.set(doc(db, "schools", SCHOOL_ID, "members", row.email), {
          role: "parent",
          name: row.name,
          classes: row.classes,
          ...(row.phone ? { phone: row.phone } : {}),
        });
      }
      await batch.commit();
      setSavedCount(toSave.length);
      setText("");
      await load();
    } catch {
      setError("השמירה נכשלה — בדקו הרשאות וחיבור");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-brand-violet">
        → חזרה לדף הבית
      </Link>

      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
        <h1 className="mb-1 text-2xl font-medium text-ink">ניהול חברים</h1>
        <p className="mb-4 text-sm text-ink/60">
          הדביקו רשימת הורים מאקסל — שורה לכל הורה:
          שם, מייל, כיתות (מופרדות ברווח), טלפון.
        </p>

        {loading && <p className="text-ink/60">טוען…</p>}

        {!loading && (!user || !isAdmin) && (
          <p className="text-ink/70">הדף הזה זמין רק למנהל/ת האתר.</p>
        )}

        {isAdmin && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"רותי כהן, ruti@gmail.com, ב2, 050-1234567\nדני לוי\tdani@gmail.com\tב2 ה1\t052-7654321"}
              className="w-full rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              dir="rtl"
            />

            {bad.length > 0 && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                <div className="mb-1 font-medium">
                  {bad.length} שורות לא פוענחו:
                </div>
                <ul className="flex flex-col gap-0.5">
                  {bad.map((b, i) => (
                    <li key={i} className="truncate">
                      {b.reason} — <span className="text-red-600">{b.line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-right text-xs text-ink/60">
                      <th className="p-2 font-medium">שם</th>
                      <th className="p-2 font-medium">מייל</th>
                      <th className="p-2 font-medium">כיתות</th>
                      <th className="p-2 font-medium">טלפון</th>
                      <th className="p-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row) => (
                      <tr
                        key={row.email}
                        className={`border-t border-ink/5 ${row.exists ? "text-ink/40" : "text-ink"}`}
                      >
                        <td className="p-2">{row.name}</td>
                        <td className="p-2" dir="ltr">{row.email}</td>
                        <td className="p-2">{row.classes.join(" ")}</td>
                        <td className="p-2" dir="ltr">{row.phone}</td>
                        <td className="p-2 text-xs">
                          {row.exists ? "קיים — ידולג" : "חדש"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={saving || toSave.length === 0}
                onClick={save}
                className="rounded-full bg-brand-purple px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet disabled:opacity-50"
              >
                {saving
                  ? "שומר…"
                  : `שמירת ${toSave.length} הורים חדשים`}
              </button>
              {savedCount !== null && (
                <span className="text-sm text-green-700">
                  נשמרו {savedCount} הורים 🎉
                </span>
              )}
              {error && <span className="text-sm text-red-700">{error}</span>}
            </div>

            <h2 className="mt-8 mb-3 text-lg font-medium text-ink">
              חברים קיימים ({existing.length})
            </h2>
            <div className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-right text-xs text-ink/60">
                    <th className="p-2 font-medium">שם</th>
                    <th className="p-2 font-medium">מייל</th>
                    <th className="p-2 font-medium">תפקיד</th>
                    <th className="p-2 font-medium">כיתות</th>
                    <th className="p-2 font-medium">טלפון</th>
                    <th className="p-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {existing.map((m) =>
                    editing === m.email ? (
                      <tr key={m.email} className="border-t border-ink/5 bg-surface/60 text-ink">
                        <td className="p-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-24 rounded-lg bg-card p-1.5 text-sm ring-1 ring-ink/10"
                          />
                        </td>
                        <td className="p-2 text-ink/50" dir="ltr">{m.email}</td>
                        <td className="p-2">
                          <select
                            value={m.email === myEmail ? m.role : editForm.role}
                            disabled={m.email === myEmail}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as MemberRole })}
                            className="rounded-lg bg-card p-1.5 text-sm ring-1 ring-ink/10 disabled:opacity-50"
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            value={editForm.classes}
                            onChange={(e) => setEditForm({ ...editForm, classes: e.target.value })}
                            placeholder="ב2 ה1"
                            className="w-20 rounded-lg bg-card p-1.5 text-sm ring-1 ring-ink/10"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            dir="ltr"
                            className="w-28 rounded-lg bg-card p-1.5 text-sm ring-1 ring-ink/10"
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={rowBusy === m.email}
                            onClick={() => saveEdit(m.email)}
                            className="rounded-full bg-brand-purple px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                          >
                            שמירה
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="ms-1 rounded-full px-2 py-1 text-xs text-ink/50 hover:text-ink"
                          >
                            ביטול
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={m.email} className="border-t border-ink/5 text-ink">
                        <td className="p-2">{m.name ?? ""}</td>
                        <td className="p-2" dir="ltr">{m.email}</td>
                        <td className="p-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              m.role === "parent"
                                ? "bg-brand-blue/10 text-brand-blue"
                                : "bg-brand-purple/10 text-brand-purple"
                            }`}
                          >
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                        <td className="p-2">{m.classes?.join(" ") ?? ""}</td>
                        <td className="p-2" dir="ltr">{m.phone ?? ""}</td>
                        <td className="p-2 whitespace-nowrap text-xs">
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            className="rounded-full px-2 py-1 font-medium text-brand-violet hover:bg-brand-purple/10"
                          >
                            עריכה
                          </button>
                          {m.email !== myEmail && (
                            <button
                              type="button"
                              disabled={rowBusy === m.email}
                              onClick={() => removeMember(m)}
                              className="rounded-full px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              מחיקה
                            </button>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
