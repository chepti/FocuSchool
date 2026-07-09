"use client";

import { useMemo, useState } from "react";
import type { SchoolEvent } from "@/lib/types";
import {
  hebrewDayLabel,
  hebrewDayMonthLabel,
  hebrewDayNumber,
  hebrewMonthKey,
  hebrewMonthYearLabel,
} from "@/lib/hebrew-date";

type CalMode = "gregorian" | "hebrew";

const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function isoOf(date: Date): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function monthKey(date: Date, mode: CalMode): string {
  return mode === "gregorian"
    ? `${date.getFullYear()}-${date.getMonth()}`
    : hebrewMonthKey(date);
}

function startOfMonth(date: Date, mode: CalMode): Date {
  const start = new Date(date);
  if (mode === "gregorian") {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - (hebrewDayNumber(start) - 1));
  }
  return start;
}

function monthDays(anchor: Date, mode: CalMode): Date[] {
  const start = startOfMonth(anchor, mode);
  const key = monthKey(start, mode);
  const days: Date[] = [];
  const cursor = new Date(start);
  while (monthKey(cursor, mode) === key && days.length < 40) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function gregorianLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}

export function EventsCalendar({
  events,
  calendarId,
}: {
  events: SchoolEvent[];
  calendarId?: string;
}) {
  const firstUpcoming = useMemo(() => {
    const today = isoOf(new Date());
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.find((e) => e.date >= today) ?? sorted[0];
  }, [events]);

  const [mode, setMode] = useState<CalMode>("gregorian");
  const [anchorIso, setAnchorIso] = useState<string>(
    firstUpcoming?.date ?? isoOf(new Date()),
  );
  const [selectedIso, setSelectedIso] = useState<string | null>(
    firstUpcoming?.date ?? null,
  );

  const anchor = useMemo(() => new Date(`${anchorIso}T12:00:00`), [anchorIso]);
  const days = useMemo(() => monthDays(anchor, mode), [anchor, mode]);
  const first = days[0];
  const last = days[days.length - 1];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, SchoolEvent[]>();
    for (const event of events) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    return map;
  }, [events]);

  const title =
    mode === "gregorian"
      ? first.toLocaleDateString("he-IL", { month: "long", year: "numeric" })
      : hebrewMonthYearLabel(first);

  const subtitle =
    mode === "gregorian"
      ? `${hebrewDayMonthLabel(first)} — ${hebrewDayMonthLabel(last)}`
      : `${gregorianLabel(first)} — ${gregorianLabel(last)}`;

  const move = (direction: 1 | -1) => {
    const target = new Date(direction === 1 ? last : first);
    target.setDate(target.getDate() + direction);
    if (direction === -1) target.setTime(startOfMonth(target, mode).getTime());
    setAnchorIso(isoOf(target));
  };

  const todayIso = isoOf(new Date());
  const selectedEvents = selectedIso ? (eventsByDay.get(selectedIso) ?? []) : [];
  const selectedDate = selectedIso
    ? new Date(`${selectedIso}T12:00:00`)
    : null;

  return (
    <section id="events" className="bg-ink/[.03] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-medium text-ink">
            <span className="border-b-4 border-brand-purple pb-1">
              לוח אירועים
            </span>
          </h2>
          <div className="ms-auto flex rounded-full bg-card p-1 shadow-sm ring-1 ring-ink/10">
            {(
              [
                ["gregorian", "חודש לועזי"],
                ["hebrew", "חודש עברי"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === value
                    ? "bg-brand-purple text-white"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* הלוח */}
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet transition hover:bg-brand-purple/10"
              >
                → הקודם
              </button>
              <div className="text-center">
                <div className="text-lg font-medium text-ink">{title}</div>
                <div className="text-xs text-ink/50">{subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => move(1)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-violet transition hover:bg-brand-purple/10"
              >
                הבא ←
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink/50">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: first.getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const iso = isoOf(day);
                const dayEvents = eventsByDay.get(iso) ?? [];
                const isSelected = iso === selectedIso;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedIso(iso)}
                    className={`flex min-h-16 flex-col items-stretch rounded-xl p-1.5 text-right transition ${
                      isSelected
                        ? "bg-brand-purple/15 ring-2 ring-brand-purple"
                        : "hover:bg-ink/5"
                    } ${isToday ? "ring-2 ring-brand-pink" : ""}`}
                  >
                    <span className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-ink">
                        {day.getDate()}
                      </span>
                      <span className="text-ink/45">{hebrewDayLabel(day)}</span>
                    </span>
                    <span className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className="truncate rounded bg-brand-pink/15 px-1 py-0.5 text-[10px] leading-tight text-brand-magenta"
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-ink/50">
                          ‎+{dayEvents.length - 2}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* פירוט בצד */}
          <aside className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5">
            {selectedDate ? (
              <>
                <div className="mb-3 border-b border-ink/10 pb-3">
                  <div className="text-lg font-medium text-ink">
                    {gregorianLabel(selectedDate)}
                  </div>
                  <div className="text-sm text-brand-violet">
                    {hebrewDayMonthLabel(selectedDate)}
                  </div>
                </div>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-ink/50">אין אירועים ביום זה.</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <h3 className="font-medium text-ink">{event.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink/70">
                          {event.publicInfo}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {event.grades.length === 0 ? (
                            <span className="rounded-full bg-brand-pink/10 px-2.5 py-0.5 text-xs font-medium text-brand-pink">
                              כל בית הספר
                            </span>
                          ) : (
                            event.grades.map((grade) => (
                              <span
                                key={grade}
                                className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue"
                              >
                                שכבה {grade}׳
                              </span>
                            ))
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-ink/50">
                בחרו יום בלוח כדי לראות את פרטי האירועים.
              </p>
            )}
            {calendarId ? (
              <a
                href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-xl bg-brand-purple/10 px-3 py-2 text-center text-xs font-medium text-brand-violet transition hover:bg-brand-purple/20"
              >
                📅 הוסיפו את לוח בית הספר ליומן גוגל שלכם
              </a>
            ) : (
              <p className="mt-4 rounded-xl bg-brand-purple/10 px-3 py-2 text-xs font-medium text-brand-violet">
                בקרוב: הוספת הלוח ליומן גוגל שלך
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
