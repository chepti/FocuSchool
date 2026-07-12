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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useMember } from "@/lib/useMember";
import type { FeeRecord, Member, Poll, PollVote } from "@/lib/types";

const SCHOOL_ID = "demo";
const GRADIENTS = [
  "from-brand-pink to-brand-purple",
  "from-brand-purple to-brand-blue",
  "from-brand-blue to-brand-violet",
  "from-brand-violet to-brand-pink",
];

interface ParentRow extends Member {
  email: string;
}

/** תוצאות חיות של סקר אחד — לתצוגת הוועד */
function PollResults({ poll }: { poll: Poll }) {
  const [votes, setVotes] = useState<PollVote[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "schools", SCHOOL_ID, "polls", poll.id, "votes"),
      (snap) => setVotes(snap.docs.map((d) => d.data() as PollVote)),
    );
  }, [poll.id]);

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {poll.options.map((o) => {
        const count = votes.filter((v) => v.optionId === o.id).length;
        const pct = votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
        return (
          <li key={o.id} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink">{o.label}</span>
              <span className="text-xs text-ink/50">
                {count} ({pct}%)
              </span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand-purple transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
      <li className="text-xs text-ink/40">{votes.length} הצבעות</li>
    </ul>
  );
}

export default function CommitteePage() {
  const { user, member, loading } = useMember(SCHOOL_ID);
  const allowed = member?.role === "committee" || member?.role === "admin";

  const [members, setMembers] = useState<ParentRow[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [fees, setFees] = useState<Record<string, FeeRecord>>({});

  // פרסום החלטה
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionBody, setDecisionBody] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState<string | null>(null);

  // יצירת סקר
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [pollClasses, setPollClasses] = useState<string[]>([]);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getDocs(collection(getDb(), "schools", SCHOOL_ID, "members"))
      .then((snap) =>
        setMembers(
          snap.docs.map((d) => ({ email: d.id, ...(d.data() as Member) })),
        ),
      )
      .catch(() => {});
    const unsubPolls = onSnapshot(
      collection(getDb(), "schools", SCHOOL_ID, "polls"),
      (snap) =>
        setPolls(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Poll)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
    );
    const unsubFees = onSnapshot(
      collection(getDb(), "schools", SCHOOL_ID, "fees"),
      (snap) => {
        const next: Record<string, FeeRecord> = {};
        for (const d of snap.docs) next[d.id] = d.data() as FeeRecord;
        setFees(next);
      },
    );
    return () => {
      unsubPolls();
      unsubFees();
    };
  }, [allowed]);

  const allClasses = useMemo(
    () =>
      [...new Set(members.flatMap((m) => m.classes ?? []))].sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
    [members],
  );

  const parents = useMemo(
    () =>
      members
        .filter((m) => m.role === "parent" || m.role === "committee")
        .sort((a, b) =>
          `${(a.classes ?? []).join(" ")} ${a.name ?? a.email}`.localeCompare(
            `${(b.classes ?? []).join(" ")} ${b.name ?? b.email}`,
            "he",
          ),
        ),
    [members],
  );

  const paidCount = parents.filter((p) => fees[p.email]?.paid).length;

  async function publishDecision() {
    if (!decisionTitle.trim() || !user?.email) return;
    setDecisionBusy(true);
    setDecisionStatus(null);
    try {
      await addDoc(
        collection(getDb(), "schools", SCHOOL_ID, "strips", "committee", "items"),
        {
          status: "published",
          title: decisionTitle.trim(),
          ...(decisionBody.trim() ? { body: decisionBody.trim() } : {}),
          emoji: "🤝",
          gradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
          date: new Date().toISOString().slice(0, 10),
          createdBy: user.email.toLowerCase(),
        },
      );
      setDecisionTitle("");
      setDecisionBody("");
      setDecisionStatus("פורסם! יופיע ברצועת הוועד בדף הבית (עד 5 דק')");
    } catch {
      setDecisionStatus("הפרסום נכשל — ודאו שרצועת הוועד קיימת");
    } finally {
      setDecisionBusy(false);
    }
  }

  async function createPoll() {
    const options = optionsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!question.trim() || options.length < 2 || !user?.email) return;
    setPollBusy(true);
    setPollStatus(null);
    try {
      await addDoc(collection(getDb(), "schools", SCHOOL_ID, "polls"), {
        question: question.trim(),
        options: options.map((label, i) => ({ id: `o${i + 1}`, label })),
        classes: pollClasses,
        open: true,
        createdBy: user.email.toLowerCase(),
        createdAt: new Date().toISOString(),
      });
      setQuestion("");
      setOptionsText("");
      setPollClasses([]);
      setPollStatus("הסקר פורסם 🎉 ההורים מצביעים מהאזור האישי");
    } catch {
      setPollStatus("היצירה נכשלה");
    } finally {
      setPollBusy(false);
    }
  }

  async function togglePoll(poll: Poll) {
    await updateDoc(doc(getDb(), "schools", SCHOOL_ID, "polls", poll.id), {
      open: !poll.open,
    }).catch(() => {});
  }

  async function removePoll(poll: Poll) {
    if (!window.confirm(`למחוק את הסקר "${poll.question}"?`)) return;
    const votesSnap = await getDocs(
      collection(getDb(), "schools", SCHOOL_ID, "polls", poll.id, "votes"),
    );
    await Promise.all(votesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(getDb(), "schools", SCHOOL_ID, "polls", poll.id));
  }

  async function toggleFee(email: string) {
    if (!user?.email) return;
    await setDoc(doc(getDb(), "schools", SCHOOL_ID, "fees", email), {
      paid: !(fees[email]?.paid ?? false),
      at: new Date().toISOString(),
      updatedBy: user.email.toLowerCase(),
    }).catch(() => {});
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-brand-violet">
          → חזרה לדף הבית
        </Link>
        {allowed && (
          <Link
            href="/signups"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
          >
            🧺 אירוע כיתה / שיבוצים
          </Link>
        )}
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
        <h1 className="mb-1 text-2xl font-medium text-ink">ועד ההורים 🤝</h1>

        {loading && <p className="text-ink/60">טוען…</p>}
        {!loading && (!user || !allowed) && (
          <p className="text-ink/70">
            הדף הזה זמין לחברי ועד ההורים ולהנהלת האתר בלבד.
          </p>
        )}

        {allowed && (
          <>
            <p className="mb-4 text-sm text-ink/60">
              פרסום החלטה — מופיעה ברצועת הוועד בדף הבית, לעיני כולם.
            </p>
            <div className="flex flex-col gap-2">
              <input
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                placeholder='כותרת ההחלטה — למשל "אושר תקציב מסיבת סיום"'
                className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              />
              <textarea
                value={decisionBody}
                onChange={(e) => setDecisionBody(e.target.value)}
                rows={3}
                placeholder="פירוט (אופציונלי)"
                className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={decisionBusy || !decisionTitle.trim()}
                  onClick={publishDecision}
                  className="rounded-full bg-brand-purple px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet disabled:opacity-50"
                >
                  {decisionBusy ? "מפרסם…" : "פרסום החלטה"}
                </button>
                {decisionStatus && (
                  <span className="text-sm text-ink/70">{decisionStatus}</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {allowed && (
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
          <h2 className="mb-1 text-xl font-medium text-ink">סקרים והצבעות 🗳️</h2>
          <p className="mb-4 text-sm text-ink/60">
            ההורים מצביעים מהאזור האישי; התוצאות מתעדכנות כאן בזמן אמת.
          </p>

          <div className="flex flex-col gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='שאלה — למשל "לאן נצא בטיול המשפחות?"'
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={3}
              placeholder={"אפשרות בכל שורה (לפחות שתיים):\nפארק הירקון\nחוף הים\nיער בן שמן"}
              className="rounded-xl bg-surface p-3 text-sm text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-brand-purple"
            />
            <div className="flex flex-wrap gap-1.5">
              {allClasses.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setPollClasses(
                      pollClasses.includes(c)
                        ? pollClasses.filter((v) => v !== c)
                        : [...pollClasses, c],
                    )
                  }
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    pollClasses.includes(c)
                      ? "bg-brand-purple text-white"
                      : "bg-surface text-ink/70 ring-1 ring-ink/10"
                  }`}
                >
                  {c}
                </button>
              ))}
              <span className="self-center text-xs text-ink/40">
                (ללא בחירה = כל בית הספר)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={
                  pollBusy ||
                  !question.trim() ||
                  optionsText.split("\n").filter((l) => l.trim()).length < 2
                }
                onClick={createPoll}
                className="rounded-full bg-brand-pink px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-purple disabled:opacity-50"
              >
                {pollBusy ? "יוצר…" : "פתיחת סקר"}
              </button>
              {pollStatus && (
                <span className="text-sm text-ink/70">{pollStatus}</span>
              )}
            </div>
          </div>

          {polls.length > 0 && (
            <ul className="mt-5 flex flex-col gap-3">
              {polls.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-surface p-4 ring-1 ring-ink/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-medium text-ink">
                      {p.question}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.open
                          ? "bg-green-100 text-green-800"
                          : "bg-ink/5 text-ink/50"
                      }`}
                    >
                      {p.open ? "פתוח" : "סגור"}
                    </span>
                  </div>
                  {p.classes.length > 0 && (
                    <div className="mt-0.5 text-xs text-ink/50">
                      כיתות: {p.classes.join(" ")}
                    </div>
                  )}
                  <PollResults poll={p} />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePoll(p)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-brand-violet ring-1 ring-brand-violet/30 hover:bg-brand-purple/10"
                    >
                      {p.open ? "סגירת הסקר" : "פתיחה מחדש"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePoll(p)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      מחיקה
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {allowed && (
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-ink/5">
          <h2 className="mb-1 text-xl font-medium text-ink">
            דמי ועד 💰
            <span className="ms-2 text-sm font-normal text-ink/50">
              {paidCount}/{parents.length} שילמו
            </span>
          </h2>
          <p className="mb-3 text-sm text-ink/60">
            גלוי לוועד ולהנהלת האתר בלבד — ההורים לא רואים זה את זה.
          </p>
          <ul className="flex flex-col">
            {parents.map((p) => {
              const paid = fees[p.email]?.paid ?? false;
              return (
                <li
                  key={p.email}
                  className="flex items-center gap-3 border-t border-ink/5 py-2 first:border-t-0"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={paid}
                      onChange={() => toggleFee(p.email)}
                    />
                    <span className={paid ? "text-ink/50" : "text-ink"}>
                      {p.name ?? p.email}
                    </span>
                    <span className="text-xs text-ink/40">
                      {(p.classes ?? []).join(" ")}
                    </span>
                  </label>
                  {paid && (
                    <span className="text-xs font-medium text-green-700">
                      שולם ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
