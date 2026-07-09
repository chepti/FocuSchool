import { Header } from "@/components/Header";
import { StripRow } from "@/components/StripRow";
import { EventsCalendar } from "@/components/EventsCalendar";
import { Footer } from "@/components/Footer";
import { demoSchool, demoStrips, demoEvents } from "@/lib/demo-data";

export default function HomePage() {
  const strips = [...demoStrips].sort((a, b) => a.order - b.order);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: demoSchool.name,
    description: demoSchool.description,
    address: { "@type": "PostalAddress", addressLocality: demoSchool.city },
  };

  return (
    <>
      <Header school={demoSchool} />
      <main className="flex-1 py-4">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {strips.map((strip) => (
          <StripRow key={strip.id} strip={strip} />
        ))}
        <EventsCalendar events={demoEvents} />
      </main>
      <Footer />
    </>
  );
}
