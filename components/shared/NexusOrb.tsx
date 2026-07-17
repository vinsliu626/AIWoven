"use client";

import { AIWovenMark } from "@/components/brand/AIWovenLogo";

/**
 * Kept under its historical export name so existing product imports remain stable.
 * The rendered identity is the AIWoven compact mark.
 */
export function NexusOrb({
  className = "",
  sizeClass = "h-8 w-8",
}: {
  className?: string;
  sizeClass?: string;
}) {
  return (
    <span className={["relative inline-grid place-items-center", sizeClass, className].join(" ")}>
      <span className="absolute -inset-1 rounded-2xl bg-cyan-300/10 blur-md" aria-hidden />
      <AIWovenMark className="relative h-full w-full" title="AIWoven logo" />
    </span>
  );
}
