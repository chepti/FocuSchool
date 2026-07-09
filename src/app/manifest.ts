import type { MetadataRoute } from "next";
import { demoSchool } from "@/lib/demo-data";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${demoSchool.name} — פוקוסקול`,
    short_name: demoSchool.name,
    description: demoSchool.description,
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#faf8ff",
    theme_color: "#2f0b69",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
