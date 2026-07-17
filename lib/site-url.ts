const PRODUCTION_SITE_URL = "https://aiwoven.app";
const DEVELOPMENT_SITE_URL = "http://localhost:3000";

const CANONICAL_SITE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
] as const;

const DEVELOPMENT_SITE_URL_ENV_KEYS = [
  ...CANONICAL_SITE_URL_ENV_KEYS,
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

function withProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function normalizeSiteUrl(value: string) {
  return new URL(withProtocol(value.trim())).toString().replace(/\/$/, "");
}

function isLocalSeoHost(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

export function resolveSiteUrl(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === "production";
  const keys = production ? CANONICAL_SITE_URL_ENV_KEYS : DEVELOPMENT_SITE_URL_ENV_KEYS;

  for (const key of keys) {
    const candidate = env[key];
    if (!candidate) continue;

    try {
      const normalized = new URL(normalizeSiteUrl(candidate));
      if (production && isLocalSeoHost(normalized)) {
        continue;
      }
      return normalized.toString().replace(/\/$/, "");
    } catch {
      continue;
    }
  }

  return production ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
}

export function getSiteUrl() {
  return resolveSiteUrl(process.env);
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
