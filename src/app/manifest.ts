import type { MetadataRoute } from "next";
import { SCHOOL_DESCRIPTION, SCHOOL_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SCHOOL_NAME} — פוקוסקול`,
    short_name: SCHOOL_NAME,
    description: SCHOOL_DESCRIPTION,
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
