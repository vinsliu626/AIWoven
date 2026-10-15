import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, per-user areas. They also send noindex, but there is nothing for crawlers there.
        disallow: ["/api/", "/account", "/owner/", "/study/session/", "/study/quiz/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
