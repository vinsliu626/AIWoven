import type { ReactNode } from "react";

import { SeoLandingSection } from "@/components/seo/SeoLandingSection";
import type { ToolSeoContent } from "@/lib/seo/toolPageContent";

const trustSignals = ["Free plan available", "Private by default", "No setup required"] as const;

export function ToolLandingPageSection({
  hero,
  children,
}: {
  hero: ToolSeoContent;
  children: ReactNode;
}) {
  return (
    <>
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-6 md:px-8 md:pt-8">
        <div className="mb-6">
          <div className="max-w-3xl">
            <p className="ui-eyebrow">{hero.heroEyebrow}</p>
            <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px] sm:leading-9">
              {hero.heroTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500">{hero.heroSubtitle}</p>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Highlights">
            {trustSignals.map((signal) => (
              <li key={signal} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5 text-emerald-600"><path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {signal}
              </li>
            ))}
          </ul>
        </div>

        {children}
      </section>

      <SeoLandingSection content={hero} />
    </>
  );
}
