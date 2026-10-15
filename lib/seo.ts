import type { Metadata } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export const SITE_NAME = "AIWoven";
export { absoluteUrl, getSiteUrl } from "@/lib/site-url";

/**
 * Default social preview. Page-level `openGraph` objects replace the root layout's, so every
 * builder below sets the image explicitly instead of relying on inheritance.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/brand/aiwoven-image2-concept.png",
  width: 1536,
  height: 1024,
  alt: "AIWoven AI study workspace",
};

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  robots?: Metadata["robots"];
};

type ArticleMetadataInput = MetadataInput & {
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
};

export function buildMetadata({ title, description, path, keywords, robots }: MetadataInput): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(path),
      locale: "en_US",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
    robots,
  };
}

export function buildArticleMetadata({ title, description, path, keywords, robots, publishedTime, modifiedTime, section, tags }: ArticleMetadataInput): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(path),
      locale: "en_US",
      images: [DEFAULT_OG_IMAGE],
      publishedTime,
      modifiedTime: modifiedTime ?? publishedTime,
      section,
      tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
    robots,
  };
}

/** Metadata for authenticated or personal pages that should never appear in search results. */
export function buildPrivateMetadata({ title, path }: { title: string; path: string }): Metadata {
  return {
    title: { absolute: title },
    alternates: { canonical: absoluteUrl(path) },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

/** Serialize JSON-LD for a <script> tag without allowing "</script>" breakouts. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
