"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useMember } from "@/lib/useMember";
import { attachForegroundNotifications } from "@/lib/push";
import { PushButton } from "./PushButton";
import type {
  ClassSchedule,
  SchoolEvent,
  SchoolMessage,
  StaffMember,
} from "@/lib/types";
import { hebrewDayMonthLabel } from "@/lib/hebrew-date";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];

/** "ב2" → "ב" — שכבה מתוך שם כיתה */
function gradeOf(className: string): string {
  return className.replace(/\d+$/, "");
}

interface ClassWithSchedule {
  classId: string;
  schedule: ClassSchedule;
}

export function ParentZone({
  events,
  schoolId = "demo",
}: {
  events: SchoolEvent[];
  schoolId?: string;
}) {
  const { user, member, loading } = useMember(schoolId);
  const [schedules, setSchedules] = useState<ClassWithSchedule[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [messages, setMessages] = useState<SchoolMessage[]>([]);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);

  const classes = member?.classes ?? [];
  const show =
    member != null && (member.role === "parent" || classes.length > 0);

  // הודעות שמגיעות כשהאתר פתוח על המסך — מוצגות ידנית
  useEffect(() => {
    if (!user) return;
    let detach: (() => void) | undefined;
    attachForegroundNotifications().then((fn) => {
      detach = fn;
    });
    return () => detach?.();
  }, [user]);

  // הודעות מהצוות — עדכונים שבועיים, תזכורות והודעות אישיות
  useEffect(() => {
    if (!show || !user?.email) return;
    const email = user.email.toLowerCase();
    const myClasses = member?.classes ?? [];
    const grades = [...new Set(myClasses.map(gradeOf))];
    let cancelled = false;

    getDocs(
      query(
        collection(getDb(), "schools", schoolId, "messages"),
        orderBy("createdAt", "desc"),
        limit(30),
      ),
    )
      .then((snap) => {
        if (cancelled) return;
        const now = new Date().toISOString();
        const relevant = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as SchoolMessage)
          .filter((m) => m.sendAt <= now)
          .filter((m) => {
            if (m.emails && m.emails.length > 0) return m.emails.includes(email);
            if (m.classes && m.classes.length > 0) {
              return m.classes.some(
                (c) => myClasses.includes(c) || grades.includes(c),
              );
            }
            return true; // כל בית הספר
          });
        // עדכון שבועי — רק האחרון לכל כיתה
        const seenWeekly = new Set<string>();
        setMessages(
          relevant.filter((m) => {
            if (m.type !== "weekly") return true;
            const key = m.classes?.[0] ?? "";
            if (seenWeekly.has(key)) return false;
            seenWeekly.add(key);
            return true;
          }),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, user, member, schoolId]);

  useEffect(() => {
    if (!show || classes.length === 0) return;
    const db = getDb();
    let cancelled = false;

    (async () => {
      try {
        const [scheduleSnaps, staffSnap] = await Promise.all([
          Promise.all(
            classes.map((classId) =>
              getDoc(doc(db, "schools", schoolId, "schedules", classId)),
            ),
          ),
          getDocs(
            query(
              collection(db, "schools", schoolId, "staff"),
              where("classes", "array-contains-any", classes.slice(0, 10)),
            ),
          ),
        ]);
        if (cancelled) return;
        setSchedules(
          scheduleSnaps
            .filter((s) => s.exists())
            .map((s) => ({ classId: s.id, schedule: s.data() as ClassSchedule })),
        );
        setStaff(
          staffSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as StaffMember,
          ),
        );
      } catch {
        // אין הרשאה / אין רשת — האזור פשוט יציג פחות
      }
    })();

    return () => {
      cancelled = true;
    };
    // classes נגזר מ-member — תלות בו מספיקה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, member, schoolId]);

  // מחובר אבל לא מזוהה (או הורה בלי כיתות) — כפתור "הורה?" עם הסבר
  if (!show) {
    if (loading || !user) return null;
    return (
      <section className="mx-auto max-w-6xl px-4 pt-4">
        <button
          type="button"
          onClick={() => setHintOpen(!hintOpen)}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-brand-violet ring-1 ring-brand-violet/30 transition hover:bg-brand-purple/10"
        >
          הורה? 🤔
        </button>
        {hintOpen && (
          <div className="mt-2 rounded-2xl bg-card p-4 text-sm leading-relaxed text-ink/80 shadow-sm ring-1 ring-ink/5">
            <p>
              מחוברים כ־
              <span dir="ltr" className="font-medium">{user.email}</span>
              {" "}אבל האתר עדיין לא מזהה אתכם כהורה בבית הספר.
            </p>
            <p className="mt-1">
              ההרשאות מזוהות אוטומטית לפי כתובת המייל — בלי סיסמאות. אם אתם
              הורים בבית הספר ולא רואים את הכיתה של ילדכם, פנו למחנכ/ת או
              למזכירות ובקשו שיוסיפו את הכתובת הזו לרשימת ההורים. אחרי
              ההוספה — פשוט היכנסו שוב.
            </p>
          </div>
        )}
      </section>
    );
  }

  const grades = [...new Set(classes.map(gradeOf))];
  const today = new Date().toISOString().slice(0, 10);
  const myEvents = events
    .filter((e) => e.date >= today)
    .filter(
      (e) => e.grades.length === 0 || e.grades.some((g) => grades.includes(g)),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="rounded-2xl bg-gradient-to-bl from-brand-purple/10 to-brand-pink/10 p-5 ring-1 ring-brand-purple/15">
        <h2 className="text-xl font-medium text-ink">
          שלום{member.name ? ` ${member.name}` : ""} 👋
        </h2>
        {classes.length > 0 ? (
          <p className="text-sm text-ink/60">
            הכיתות שלך: {classes.join(" · ")}
          </p>
        ) : (
          <p className="text-sm text-ink/60">
            לא משויכות לכם כיתות עדיין — פנו למחנכ/ת או למזכירות כדי לעדכן,
            ותראו כאן מערכת שעות, אלפון מורים ואירועים של הכיתה.
          </p>
        )}

        {user?.email && (
          <div className="mt-3">
            <PushButton schoolId={schoolId} email={user.email} />
          </div>
        )}

        {messages.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-brand-violet">
              הודעות מהצוות
            </h3>
            <ul className="flex flex-col gap-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl bg-card/80 px-4 py-3 ring-1 ring-ink/5"
                >
                  <div className="mb-1 flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-brand-purple">
                      {m.type === "weekly"
                        ? `עדכון שבועי${m.classes?.[0] ? ` · כיתה ${m.classes[0]}` : ""}`
                        : m.type === "targeted"
                          ? "הודעה אישית 🎯"
                          : "תזכורת ⏰"}
                    </span>
                    <span className="text-ink/40">
                      {new Date(m.createdAt).toLocaleDateString("he-IL", {
                        day: "numeric",
                        month: "numeric",
                      })}
                    </span>
                  </div>
                  {m.title && (
                    <div className="font-medium text-ink">{m.title}</div>
                  )}
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                    {m.body}
                  </p>
                  {m.homework && (
                    <p className="mt-1.5 rounded-lg bg-brand-purple/5 px-2.5 py-1.5 text-sm text-ink/80">
                      📚 שיעורי בית: {m.homework}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {myEvents.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-brand-violet">
              אירועים קרובים שלכם
            </h3>
            <ul className="flex flex-col gap-1.5">
              {myEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline gap-2 rounded-xl bg-card/80 px-3 py-2 text-sm ring-1 ring-ink/5"
                >
                  <span className="shrink-0 font-medium text-brand-pink">
                    {hebrewDayMonthLabel(new Date(e.date))}
                  </span>
                  <span className="text-ink">{e.title}</span>
                  {e.grades.length > 0 && (
                    <span className="ms-auto shrink-0 rounded-full bg-brand-purple/10 px-2 py-0.5 text-xs text-brand-purple">
                      {e.grades.join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {schedules.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-brand-violet">
              מערכת שעות
            </h3>
            <div className="flex flex-wrap gap-2">
              {schedules.map(({ classId }) => (
                <button
                  key={classId}
                  type="button"
                  onClick={() =>
                    setOpenClass(openClass === classId ? null : classId)
                  }
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    openClass === classId
                      ? "bg-brand-purple text-white"
                      : "bg-card text-brand-violet ring-1 ring-brand-violet/30"
                  }`}
                >
                  כיתה {classId}
                </button>
              ))}
            </div>
            {schedules
              .filter(({ classId }) => classId === openClass)
              .map(({ classId, schedule }) => (
                <div
                  key={classId}
                  className="strip-scroll mt-3 overflow-x-auto rounded-xl bg-card ring-1 ring-ink/10"
                >
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="bg-surface text-right text-xs text-ink/60">
                        <th className="p-2 font-medium">שעה</th>
                        {schedule.days.map((_, i) => (
                          <th key={i} className="p-2 font-medium">
                            {DAY_NAMES[i] ?? `יום ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({
                        length: Math.max(
                          ...schedule.days.map((d) => d.lessons.length),
                        ),
                      }).map((_, hour) => (
                        <tr key={hour} className="border-t border-ink/5">
                          <td className="p-2 text-xs text-ink/50">
                            {hour + 1}
                          </td>
                          {schedule.days.map((day, i) => {
                            const lesson = day.lessons[hour];
                            return (
                              <td key={i} className="p-2">
                                {lesson && (
                                  <>
                                    <div className="font-medium text-ink">
                                      {lesson.subject}
                                    </div>
                                    {lesson.teacher && (
                                      <div className="text-xs text-ink/50">
                                        {lesson.teacher}
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}

        {staff.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-brand-violet">
              המורים של הכיתות שלכם
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {staff.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl bg-card/80 px-3 py-2 ring-1 ring-ink/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">
                      {t.name}
                    </div>
                    <div className="truncate text-xs text-ink/60">
                      {t.subjects.join(", ")} · {t.classes.join(" ")}
                    </div>
                  </div>
                  {t.email && (
                    <a
                      href={`mailto:${t.email}`}
                      title={`מייל אל ${t.name}`}
                      className="shrink-0 rounded-full bg-brand-purple/10 px-3 py-1.5 text-xs font-medium text-brand-purple transition hover:bg-brand-purple hover:text-white"
                    >
                      ✉️ מייל
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
