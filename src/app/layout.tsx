import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { demoSchool } from "@/lib/demo-data";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://focuschool.chepti.com"),
  alternates: { canonical: "/" },
  title: {
    default: `${demoSchool.name} — פוקוסקול`,
    template: `%s — ${demoSchool.name}`,
  },
  description: demoSchool.description,
  openGraph: {
    title: demoSchool.name,
    description: demoSchool.description,
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
