import type { SchoolEvent } from "@/lib/types";

function DateBadge({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
      <span className="text-2xl font-extrabold leading-none">
        {date.toLocaleDateString("he-IL", { day: "numeric" })}
      </span>
      <span className="text-xs">
        {date.toLocaleDateString("he-IL", { month: "short" })}
      </span>
    </div>
  );
}

export function EventsBoard({ events }: { events: SchoolEvent[] }) {
  const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section id="events" className="bg-ink/[.03] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">
            <span className="border-b-4 border-brand-purple pb-1">
              לוח אירועים
            </span>
          </h2>
          <span className="rounded-full bg-brand-purple/10 px-4 py-1.5 text-xs font-bold text-brand-violet">
            בקרוב: הוספה ליומן גוגל שלך
          </span>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5"
            >
              <DateBadge iso={event.date} />
              <div>
                <h3 className="font-bold text-ink">{event.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{event.publicInfo}</p>
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
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
