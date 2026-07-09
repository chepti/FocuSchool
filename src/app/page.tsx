import { Header } from "@/components/Header";
import { StripRow } from "@/components/StripRow";
import { EventsCalendar } from "@/components/EventsCalendar";
import { Footer } from "@/components/Footer";
import { getSchoolData } from "@/lib/data";

// התוכן מתרענן מ-Firestore לכל היותר כל 5 דקות (ISR)
export const revalidate = 300;

export default async function HomePage() {
  const { school, strips, events } = await getSchoolData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    description: school.description,
    address: { "@type": "PostalAddress", addressLocality: school.city },
  };

  return (
    <>
      <Header school={school} />
      <main className="flex-1 py-4">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {strips.map((strip) => (
          <StripRow key={strip.id} strip={strip} />
        ))}
        <EventsCalendar events={events} calendarId={school.calendarId} />
      </main>
      <Footer />
    </>
  );
}
