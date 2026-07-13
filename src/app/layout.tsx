import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { SCHOOL_DESCRIPTION, SCHOOL_NAME, SITE_URL } from "@/lib/config";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: `${SCHOOL_NAME} — פוקוסקול`,
    template: `%s — ${SCHOOL_NAME}`,
  },
  description: SCHOOL_DESCRIPTION,
  openGraph: {
    title: SCHOOL_NAME,
    description: SCHOOL_DESCRIPTION,
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
