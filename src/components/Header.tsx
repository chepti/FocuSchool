import Image from "next/image";
import type { School } from "@/lib/types";

export function Header({ school }: { school: School }) {
  return (
    <header className="bg-card border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-4">
        <Image
          src="/logo.svg"
          alt="פוקוסקול"
          width={110}
          height={62}
          priority
        />
        <div className="h-10 w-px bg-ink/15" aria-hidden />
        <div>
          <h1 className="text-2xl font-medium text-ink leading-tight">
            {school.name}
          </h1>
          <p className="text-sm text-ink/60">{school.city}</p>
        </div>
        <a
          href="#events"
          className="ms-auto rounded-full bg-brand-pink px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-purple"
        >
          לוח אירועים
        </a>
      </div>
    </header>
  );
}
