import type { Metadata } from "next";

export const SITE_NAME = "NexusDesk";
const PRODUCTION_SITE_URL = "https://ai-multimodel-erhw.vercel.app";
const DEVELOPMENT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string) {
  return new URL(value).toString().replace(/\/$/, "");
}

function isLocalSeoHost(url: URL) {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1"
  );
}

export function getSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const fallback =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_SITE_URL
      : DEVELOPMENT_SITE_URL;

  try {
    if (!candidate) {
      return fallback;
    }

    const normalized = new URL(candidate);
    if (process.env.NODE_ENV === "production" && isLocalSeoHost(normalized)) {
      return PRODUCTION_SITE_URL;
    }

    return normalizeSiteUrl(normalized.toString());
  } catch {
    return fallback;
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  robots?: Metadata["robots"];
};

export function buildMetadata({ title, description, path, keywords, robots }: MetadataInput): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(path),
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots,
  };
}
