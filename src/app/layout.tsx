import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { demoSchool } from "@/lib/demo-data";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
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
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
