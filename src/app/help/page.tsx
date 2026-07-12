import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HelpCenter } from "@/components/HelpCenter";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "מרכז העזרה — פוקוסקול",
  description:
    "מדריכים, הסברים ושאלות נפוצות על אתר בית הספר: התחברות, האזור האישי להורים, התראות לנייד, וכלי הצוות.",
};

export default function HelpPage() {
  return (
    <>
      <header className="border-b border-ink/10 bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="פוקוסקול"
              width={110}
              height={62}
              priority
            />
          </Link>
          <div className="h-10 w-px bg-ink/15" aria-hidden />
          <h1 className="text-lg font-medium text-ink">מרכז העזרה</h1>
          <Link
            href="/"
            className="ms-auto rounded-full px-4 py-2 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
          >
            → חזרה לאתר
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <HelpCenter />
      </main>
      <Footer />
    </>
  );
}
