import type { Strip, StripItem } from "@/lib/types";
import { PhotosRow } from "./PhotosRow";

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
  });
}

function PostCard({ item }: { item: StripItem }) {
  return (
    <article className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-ink/5">
      <div
        className={`flex h-28 items-center justify-center bg-gradient-to-bl ${item.gradient} text-5xl`}
      >
        <span aria-hidden>{item.emoji}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <time className="text-xs font-medium text-brand-purple">
          {formatDate(item.date)}
        </time>
        <h3 className="font-medium text-ink">{item.title}</h3>
        <p className="text-sm leading-relaxed text-ink/70">{item.body}</p>
      </div>
    </article>
  );
}

function FileCard({ item }: { item: StripItem }) {
  return (
    <a
      href={item.url}
      className="flex w-56 shrink-0 flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="text-4xl" aria-hidden>
        {item.emoji}
      </span>
      <span className="font-medium leading-snug text-ink">{item.title}</span>
      <span className="mt-auto text-xs text-ink/50">
        {formatDate(item.date)} · PDF
      </span>
    </a>
  );
}

function LinkCard({ item }: { item: StripItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-56 shrink-0 items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="text-3xl" aria-hidden>
        {item.emoji}
      </span>
      <span className="font-medium leading-snug text-ink">{item.title}</span>
    </a>
  );
}

const cardByType = {
  posts: PostCard,
  files: FileCard,
  links: LinkCard,
} as const;

export function StripRow({ strip }: { strip: Strip }) {
  const items = strip.items.filter((i) => i.status === "published");
  if (!strip.visible || items.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-4 text-xl font-medium text-ink">
          <span className="border-b-4 border-brand-pink pb-1">
            {strip.title}
          </span>
        </h2>
      </div>
      <div className="strip-scroll flex gap-4 overflow-x-auto px-[max(1rem,calc((100%-72rem)/2+1rem))] pb-4">
        {strip.type === "photos" ? (
          <PhotosRow stripId={strip.id} items={items} />
        ) : (
          items.map((item) => {
            const Card = cardByType[strip.type as keyof typeof cardByType];
            return <Card key={item.id} item={item} />;
          })
        )}
      </div>
    </section>
  );
}
