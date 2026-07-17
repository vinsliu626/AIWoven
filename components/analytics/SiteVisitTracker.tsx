"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return;
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      credentials: "include",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
