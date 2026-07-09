import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-card py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-ink/60">
        <p>הוקם באהבה עבור הקהילה שלנו</p>
        <p className="flex items-center gap-2">
          מופעל על ידי
          <Image src="/logo.svg" alt="פוקוסקול" width={64} height={36} />
        </p>
      </div>
    </footer>
  );
}
