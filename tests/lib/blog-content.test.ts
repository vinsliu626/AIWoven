import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { blogPosts, getBlogPostText, getBlogWordCount, getRelatedBlogPosts, slugifyHeading } from "@/lib/blog/posts";

const appDir = path.resolve(__dirname, "../../app");

/** Every internal href used in article content must resolve to a real route or another article. */
function routeExists(href: string) {
  const pathname = href.split(/[?#]/)[0];
  if (pathname === "/") return true;
  if (pathname.startsWith("/blog/")) return blogPosts.some((post) => `/blog/${post.slug}` === pathname);
  return fs.existsSync(path.join(appDir, pathname, "page.tsx"));
}

function internalLinks(html: string) {
  return [...html.matchAll(/href=['"](\/[^'"]*)['"]/g)].map((match) => match[1]);
}

function allHtml(post: (typeof blogPosts)[number]) {
  const chunks = [post.intro, ...(post.keyTakeaways ?? [])];
  for (const section of post.sections) {
    chunks.push(...(section.paragraphs ?? []));
    for (const block of section.blocks ?? []) {
      if (block.type === "p") chunks.push(block.html);
      if (block.type === "ul" || block.type === "ol") chunks.push(...block.items);
      if (block.type === "callout") chunks.push(block.html);
      if (block.type === "table") chunks.push(...block.rows.flat());
    }
  }
  return chunks.join("\n");
}

describe("blog content", () => {
  it("has unique slugs, titles, SEO titles, and descriptions", () => {
    for (const key of ["slug", "title", "seoTitle", "seoDescription"] as const) {
      const values = blogPosts.map((post) => post[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it("does not target the same primary keyword twice", () => {
    const keywords = blogPosts.map((post) => post.primaryKeyword).filter(Boolean);
    expect(new Set(keywords).size).toBe(keywords.length);
  });

  it("keeps SEO titles and descriptions within search-result friendly lengths", () => {
    for (const post of blogPosts) {
      expect(post.seoTitle.length, post.slug).toBeLessThanOrEqual(75);
      expect(post.seoDescription.length, post.slug).toBeLessThanOrEqual(170);
    }
  });

  it("uses valid ISO dates and never sets an update before publication", () => {
    for (const post of blogPosts) {
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (post.updated) expect(post.updated >= post.date, post.slug).toBe(true);
    }
  });

  it("only links to routes and articles that exist", () => {
    for (const post of blogPosts) {
      const links = [...internalLinks(allHtml(post)), ...post.ctaLinks.map((link) => link.href), post.relatedToolUrl, ...post.sections.flatMap((section) => section.toolLinks?.map((link) => link.href) ?? [])];
      for (const href of links) expect(routeExists(href), `${post.slug} → ${href}`).toBe(true);
    }
  });

  it("gives every section a unique anchor", () => {
    for (const post of blogPosts) {
      const ids = post.sections.map((section) => slugifyHeading(section.heading));
      expect(new Set(ids).size, post.slug).toBe(ids.length);
      expect(ids.every(Boolean), post.slug).toBe(true);
    }
  });

  it("backs evidence-based articles with references and keeps them substantial", () => {
    const evidenceTopics = ["how-accurate-are-ai-detectors", "ai-detector-false-positives", "how-do-ai-detectors-work", "active-recall-vs-rereading"];
    for (const slug of evidenceTopics) {
      const post = blogPosts.find((item) => item.slug === slug);
      expect(post?.references?.length ?? 0, slug).toBeGreaterThan(1);
      expect(post && getBlogWordCount(post), slug).toBeGreaterThan(700);
    }
  });

  it("never claims a detector can prove authorship", () => {
    for (const post of blogPosts.filter((item) => item.tags?.includes("ai-detection"))) {
      const text = getBlogPostText(post).toLowerCase();
      expect(text).not.toMatch(/(can|will) (definitively|conclusively) (prove|identify)/);
      expect(text).toMatch(/not (proof|reliable enough to be proof)|cannot prove|never as evidence|as proof|sole basis/);
    }
  });

  it("returns related posts that exclude the current article", () => {
    const related = getRelatedBlogPosts("how-accurate-are-ai-detectors");
    expect(related).toHaveLength(3);
    expect(related.map((post) => post.slug)).not.toContain("how-accurate-are-ai-detectors");
    expect(related.every((post) => post.tags?.includes("ai-detection"))).toBe(true);
  });
});
