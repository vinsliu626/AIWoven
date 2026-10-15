import type { MetadataRoute } from "next";

import { blogPosts, getBlogPostUrl } from "@/lib/blog/posts";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 86400;

type Entry = { path: string; priority: number; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>; lastModified?: string };

/** Public, indexable pages only. Authenticated and personal pages (account, owner, study sessions) are excluded. */
const staticEntries: Entry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/ai-note", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ai-study", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ai-detector", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ai-humanizer", priority: 0.8, changeFrequency: "monthly" },
  { path: "/chat", priority: 0.7, changeFrequency: "monthly" },
  { path: "/converter", priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/convert-pdf-to-jpg", priority: 0.6, changeFrequency: "monthly" },
  { path: "/jpg-to-png", priority: 0.6, changeFrequency: "monthly" },
  { path: "/png-to-webp", priority: 0.6, changeFrequency: "monthly" },
  { path: "/jpg-to-pdf", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const latestPost = blogPosts.reduce((latest, post) => {
    const modified = post.updated ?? post.date;
    return modified > latest ? modified : latest;
  }, "");

  const posts: Entry[] = blogPosts.map((post) => ({
    path: getBlogPostUrl(post.slug),
    priority: 0.7,
    changeFrequency: "monthly",
    lastModified: post.updated ?? post.date,
  }));

  return [...staticEntries, ...posts].map((entry) => ({
    url: absoluteUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : entry.path === "/blog" && latestPost ? { lastModified: latestPost } : {}),
  }));
}
