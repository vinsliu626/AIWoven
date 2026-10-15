"use client";

import React from "react";
import { detectAiMarker, normalizeAiText } from "@/lib/ui/aiTextFormat";

function markerClass(kind: ReturnType<typeof detectAiMarker>["kind"]) {
  switch (kind) {
    case "important":
      return "border-l-2 border-amber-400 pl-3 text-amber-700";
    case "concept":
      return "border-l-2 border-sky-400 pl-3 text-sky-700";
    case "tip":
      return "border-l-2 border-blue-400 pl-3 text-blue-700";
    case "example":
      return "border-l-2 border-emerald-400 pl-3 text-emerald-700";
    case "warning":
      return "border-l-2 border-red-400 pl-3 text-red-700";
    default:
      return "text-slate-900";
  }
}

function headingClass(level: number) {
  if (level === 1) return "text-2xl font-semibold tracking-tight text-slate-900";
  if (level === 2) return "mt-6 text-lg font-semibold text-slate-900";
  return "mt-4 text-base font-semibold text-slate-900";
}

function listIndent(line: string) {
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  return Math.min(4, Math.floor(indent / 2));
}

function indentPadding(indent: number) {
  if (indent <= 0) return "";
  if (indent === 1) return "pl-4";
  if (indent === 2) return "pl-8";
  return "pl-10";
}

export function AiFormattedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const normalized = normalizeAiText(text);
  const lines = normalized ? normalized.split("\n") : [];

  if (!normalized) return null;

  return (
    <div className={["space-y-2", className].join(" ").trim()}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`blank-${index}`} className="h-3" />;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          return (
            <div key={`${index}-${trimmed.slice(0, 18)}`} className={headingClass(heading[1].length)}>
              {heading[2]}
            </div>
          );
        }

        const bullet = line.match(/^(\s*)([-*])\s+(.+)$/);
        if (bullet) {
          const indent = listIndent(line);
          return (
            <div key={`${index}-${trimmed.slice(0, 18)}`} className={["flex gap-3", indentPadding(indent)].join(" ").trim()}>
              <span className="mt-[0.45rem] h-1.5 w-1.5 flex-none rounded-full bg-slate-300" />
              <div className="min-w-0 flex-1 text-slate-900">{bullet[3]}</div>
            </div>
          );
        }

        const numbered = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
        if (numbered) {
          const indent = listIndent(line);
          return (
            <div key={`${index}-${trimmed.slice(0, 18)}`} className={["flex gap-3", indentPadding(indent)].join(" ").trim()}>
              <span className="min-w-6 flex-none text-right text-slate-500">{numbered[2]}.</span>
              <div className="min-w-0 flex-1 text-slate-900">{numbered[3]}</div>
            </div>
          );
        }

        const marker = detectAiMarker(trimmed);
        return (
          <div key={`${index}-${trimmed.slice(0, 18)}`} className={markerClass(marker.kind)}>
            {marker.text}
          </div>
        );
      })}
    </div>
  );
}
