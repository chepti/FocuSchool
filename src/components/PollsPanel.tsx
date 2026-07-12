"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Poll, PollVote } from "@/lib/types";

/** סקר אחד — הצבעה + תוצאות חיות */
function PollCard({
  schoolId,
  poll,
  email,
}: {
  schoolId: string;
  poll: Poll;
  email: string;
}) {
  const [votes, setVotes] = useState<(PollVote & { email: string })[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "schools", schoolId, "polls", poll.id, "votes"),
      (snap) =>
        setVotes(
          snap.docs.map((d) => ({ email: d.id, ...(d.data() as PollVote) })),
        ),
    );
  }, [schoolId, poll.id]);

  const myVote = votes.find((v) => v.email === email)?.optionId;

  async function vote(optionId: string) {
    if (!poll.open || busy) return;
    setBusy(true);
    try {
      await setDoc(
        doc(getDb(), "schools", schoolId, "polls", poll.id, "votes", email),
        { optionId, at: new Date().toISOString() },
      );
    } finally {
      setBusy(false);
    }
  }

  const showResults = Boolean(myVote) || !poll.open;

  return (
    <li className="rounded-xl bg-card/80 px-4 py-3 ring-1 ring-ink/5">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="flex-1 font-medium text-ink">{poll.question}</span>
        {!poll.open && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/50">
            הסתיים
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {poll.options.map((o) => {
          const count = votes.filter((v) => v.optionId === o.id).length;
          const pct =
            votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
          const mine = myVote === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!poll.open || busy}
                onClick={() => vote(o.id)}
                className={`w-full rounded-lg p-2 text-right text-sm transition ring-1 ${
                  mine
                    ? "bg-brand-purple/10 ring-brand-purple text-ink"
                    : "ring-ink/10 text-ink/80 hover:bg-surface disabled:hover:bg-transparent"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span>
                    {mine ? "✓ " : ""}
                    {o.label}
                  </span>
                  {showResults && (
                    <span className="text-xs text-ink/50">
                      {count} ({pct}%)
                    </span>
                  )}
                </div>
                {showResults && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-brand-pink transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {poll.open && !myVote && (
        <p className="mt-1.5 text-xs text-ink/40">
          לחצו על אפשרות כדי להצביע — אפשר לשנות כל עוד הסקר פתוח.
        </p>
      )}
    </li>
  );
}

/** הסקרים הפתוחים (והאחרונים שנסגרו) הרלוונטיים להורה */
export function PollsPanel({
  schoolId,
  email,
  classes,
}: {
  schoolId: string;
  email: string;
  classes: string[];
}) {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "schools", schoolId, "polls"),
      (snap) => {
        setPolls(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Poll)
            .filter(
              (p) =>
                p.classes.length === 0 ||
                p.classes.some((c) => classes.includes(c)),
            )
            .sort(
              (a, b) =>
                Number(b.open) - Number(a.open) ||
                b.createdAt.localeCompare(a.createdAt),
            )
            .slice(0, 5),
        );
      },
      () => setPolls([]),
    );
  }, [schoolId, classes]);

  if (polls.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-brand-violet">
        סקרים והצבעות 🗳️
      </h3>
      <ul className="flex flex-col gap-2">
        {polls.map((p) => (
          <PollCard key={p.id} schoolId={schoolId} poll={p} email={email} />
        ))}
      </ul>
    </div>
  );
}
