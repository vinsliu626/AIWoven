import type { NextConfig } from "next";

const projectRoot = "C:/Users/gcswz/Desktop/AI/ai-multimodel";
const canonicalOrigin = "https://aiwoven.app";
const redirectHosts = ["ai-multimodel-erhw.vercel.app", "www.aiwoven.app"] as const;

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      ...redirectHosts.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: `${canonicalOrigin}/:path*`,
        permanent: true,
      })),
      // Legacy alias: answer with a real 308 instead of a client-side redirect page.
      { source: "/humanizer", destination: "/ai-humanizer", permanent: true },
    ];
  },
};

export default nextConfig;
