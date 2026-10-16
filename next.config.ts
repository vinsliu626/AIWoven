import type { NextConfig } from "next";

// Turbopack's workspace root is this project. It was a hard-coded Windows path, which
// made every Turbopack build/dev run on Linux (CI, Vercel builders, cloud dev) fail
// with "Invalid distDirRoot". Next runs from the project directory, so cwd is the root.
const projectRoot = process.cwd();
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
