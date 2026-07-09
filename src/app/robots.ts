import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // מסכי פעולה אישיים — לא לאינדוקס
      disallow: ["/add", "/manage"],
    },
    sitemap: "https://focuschool.chepti.com/sitemap.xml",
  };
}
