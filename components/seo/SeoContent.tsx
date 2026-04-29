import type { ReactNode } from "react";

export type SeoContentSection = {
  heading: string;
  content: ReactNode;
};

export function SeoContent({
  title,
  sections,
}: {
  title: string;
  sections: SeoContentSection[];
}) {
  return (
    <section
      aria-label={title}
      className="mx-auto mt-20 w-full max-w-5xl px-4 pb-16 md:px-8"
    >
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#070707]/90 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-32 bg-gradient-to-b from-blue-500/8 via-transparent to-transparent blur-2xl" />

        <article className="mx-auto max-w-[920px] px-6 py-10 sm:px-8 md:px-10 md:py-14">
          <div className="mb-10 border-b border-white/8 pb-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">NexusDesk Guide</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Practical product guidance for students, writers, and teams who want the tool and the workflow in one place.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.heading} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{section.heading}</h2>
                <div className="mt-5 space-y-4 text-[15px] leading-8 text-slate-300 [&_a]:font-medium [&_a]:text-blue-300 [&_a]:underline [&_a]:decoration-blue-400/45 [&_a]:underline-offset-4 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-slate-100 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ol]:space-y-3 [&_ol]:pl-5 [&_ol]:marker:text-slate-500 [&_p]:text-[15px] [&_ul]:space-y-3 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

