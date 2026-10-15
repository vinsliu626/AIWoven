export const BLOG_BASE_PATH = "/blog";

export type BlogToolHref =
  | "/ai-study"
  | "/ai-note"
  | "/ai-detector"
  | "/ai-humanizer"
  | "/converter"
  | "/convert-pdf-to-jpg"
  | "/flashcards"
  | "/quiz-me"
  | "/chat";

export type BlogToolLink = {
  href: BlogToolHref;
  label: string;
};

/**
 * Rich content blocks. String fields marked "html" accept a small, trusted subset of inline HTML
 * (<a>, <strong>, <em>, <code>) authored in this repository — never user input.
 */
export type BlogBlock =
  | { type: "p"; html: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] }
  | { type: "callout"; tone: "note" | "tip" | "warning"; title: string; html: string }
  | { type: "example"; title: string; lines: string[] };

export type BlogSection = {
  heading: string;
  /** Legacy paragraph list (html). Rendered before `blocks`. */
  paragraphs?: string[];
  bullets?: string[];
  blocks?: BlogBlock[];
  toolLinks?: BlogToolLink[];
};

export type BlogReference = {
  title: string;
  publisher: string;
  year?: string;
  url: string;
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** ISO date (YYYY-MM-DD) the article was first published on aiwoven.app. */
  date: string;
  /** ISO date of the last substantive revision, when different from `date`. */
  updated?: string;
  relatedToolUrl: BlogToolHref;
  seoTitle: string;
  seoDescription: string;
  /** Primary search intent this article targets — used to avoid cannibalization between posts. */
  primaryKeyword?: string;
  tags?: string[];
  intro: string;
  keyTakeaways?: string[];
  sections: BlogSection[];
  faqs?: BlogFaq[];
  references?: BlogReference[];
  ctaTitle: string;
  ctaDescription: string;
  ctaLinks: BlogToolLink[];
};
