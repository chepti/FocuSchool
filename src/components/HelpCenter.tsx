"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  faqItems,
  helpCategories,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help-content";

/** האם מאמר תואם למחרוזת חיפוש */
function articleMatches(article: HelpArticle, q: string): boolean {
  const haystack = [
    article.title,
    article.intro ?? "",
    ...(article.points ?? []),
    ...(article.steps ?? []),
    article.tip ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function ArticleCard({
  article,
  forceOpen,
}: {
  article: HelpArticle;
  forceOpen: boolean;
}) {
  return (
    <details
      open={forceOpen || undefined}
      className="group rounded-2xl bg-card shadow-sm ring-1 ring-ink/5 open:ring-brand-purple/25"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-2xl" aria-hidden>
          {article.emoji}
        </span>
        <span className="flex-1 font-medium text-ink">{article.title}</span>
        <span
          className="text-ink/30 transition group-open:rotate-90"
          aria-hidden
        >
          ‹
        </span>
      </summary>

      <div className="flex flex-col gap-3 px-4 pb-5 ps-[3.25rem]">
        {article.intro && (
          <p className="text-sm leading-relaxed text-ink/80">{article.intro}</p>
        )}

        {article.steps && (
          <ol className="flex flex-col gap-1.5">
            {article.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-xs font-medium text-brand-purple">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}

        {article.points && (
          <ul className="flex flex-col gap-1.5">
            {article.points.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-pink" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}

        {article.image && (
          <figure className="overflow-hidden rounded-xl ring-1 ring-ink/10">
            <Image
              src={article.image.src}
              alt={article.image.alt}
              width={1280}
              height={615}
              className="h-auto w-full"
            />
            {article.image.caption && (
              <figcaption className="bg-surface px-3 py-2 text-xs text-ink/60">
                {article.image.caption}
              </figcaption>
            )}
          </figure>
        )}

        {article.tip && (
          <p className="rounded-xl bg-brand-purple/5 px-3 py-2 text-sm leading-relaxed text-ink/80">
            💡 <span className="font-medium">טיפ:</span> {article.tip}
          </p>
        )}
      </div>
    </details>
  );
}

function CategorySection({
  category,
  query,
}: {
  category: HelpCategory;
  query: string;
}) {
  const articles = query
    ? category.articles.filter((a) => articleMatches(a, query))
    : category.articles;
  if (articles.length === 0) return null;

  return (
    <section id={category.id} className="scroll-mt-24">
      <h2 className="mb-1 text-xl font-medium text-ink">
        {category.emoji} {category.title}
      </h2>
      <p className="mb-3 text-sm text-ink/60">{category.description}</p>
      <div className="flex flex-col gap-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} forceOpen={Boolean(query)} />
        ))}
      </div>
    </section>
  );
}

export function HelpCenter() {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const { articleCount, faq } = useMemo(() => {
    const articleCount = query
      ? helpCategories.reduce(
          (n, c) => n + c.articles.filter((a) => articleMatches(a, query)).length,
          0,
        )
      : helpCategories.reduce((n, c) => n + c.articles.length, 0);
    const faq = query
      ? faqItems.filter((f) =>
          `${f.q} ${f.a}`.toLowerCase().includes(query),
        )
      : faqItems;
    return { articleCount, faq };
  }, [query]);

  return (
    <div className="flex flex-col gap-10">
      {/* חיפוש */}
      <div className="rounded-3xl bg-gradient-to-bl from-brand-purple/10 via-brand-pink/5 to-brand-blue/10 px-6 py-10 text-center ring-1 ring-brand-purple/10">
        <h1 className="text-3xl font-medium text-ink">איך נוכל לעזור? 💜</h1>
        <p className="mt-1 text-sm text-ink/60">
          כל מה שצריך לדעת על אתר בית הספר — להורים, לצוות ולמנהלים.
        </p>
        <div className="relative mx-auto mt-5 max-w-xl">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="הקלידו מה מחפשים… (למשל: התראות, מערכת שעות)"
            className="w-full rounded-full bg-card py-3 pe-12 ps-5 text-sm text-ink shadow-sm ring-1 ring-ink/10 focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
          <span
            className="absolute end-4 top-1/2 -translate-y-1/2 text-lg"
            aria-hidden
          >
            🔍
          </span>
        </div>
        {query && (
          <p className="mt-3 text-xs text-ink/50">
            נמצאו {articleCount} מדריכים ו-{faq.length} שאלות נפוצות
          </p>
        )}
      </div>

      {/* כרטיסי קטגוריות */}
      {!query && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {helpCategories.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-2xl bg-card p-5 text-center shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-3xl" aria-hidden>
                {c.emoji}
              </div>
              <div className="mt-2 font-medium text-ink">{c.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-ink/60">
                {c.description}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* מדריכים */}
      {helpCategories.map((c) => (
        <CategorySection key={c.id} category={c} query={query} />
      ))}

      {/* שאלות נפוצות */}
      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-24">
          <h2 className="mb-3 text-xl font-medium text-ink">
            ❓ שאלות נפוצות
          </h2>
          <div className="flex flex-col gap-2">
            {faq.map((item) => (
              <details
                key={item.q}
                open={Boolean(query) || undefined}
                className="group rounded-2xl bg-card shadow-sm ring-1 ring-ink/5 open:ring-brand-purple/25"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-sm font-medium text-ink">
                    {item.q}
                  </span>
                  <span
                    className="text-ink/30 transition group-open:rotate-90"
                    aria-hidden
                  >
                    ‹
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-ink/80">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {query && articleCount === 0 && faq.length === 0 && (
        <p className="text-center text-ink/60">
          לא מצאנו תשובה ל"{search}" — נסו מילה אחרת, או פנו לצוות דרך האזור
          האישי.
        </p>
      )}
    </div>
  );
}
