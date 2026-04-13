import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

const routes = [
  "/",
  "/privacy",
  "/chat",
  "/converter",
  "/ai-note",
  "/ai-detector",
  "/ai-study",
  "/ai-humanizer",
  "/convert-pdf-to-jpg",
  "/jpg-to-png",
  "/png-to-webp",
  "/jpg-to-pdf",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority:
      route === "/"
        ? 1
        : route === "/chat" ||
            route === "/converter" ||
            route === "/ai-note" ||
            route === "/ai-detector" ||
            route === "/ai-study" ||
            route === "/ai-humanizer"
        ? 0.9
        : 0.8,
  }));
}
