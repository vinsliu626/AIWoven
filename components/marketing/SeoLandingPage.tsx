import Link from "next/link";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

type LinkItem = {
  href: string;
  label: string;
};

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  paragraphs: string[];
  ctaHref: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  highlights: string[];
  relatedLinks: LinkItem[];
  faq: Array<{ question: string; answer: string }>;
};

export function SeoLandingPage({
  eyebrow,
  title,
  intro,
  paragraphs,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  highlights,
  relatedLinks,
  faq,
}: SeoLandingPageProps) {
  return (
    <>
    <SiteHeader />
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />

      <div className="relative mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 px-6 py-6 sm:px-8">
            <p className="text-[11px] uppercase tracking-[.06em] text-slate-500">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition"
              >
                {ctaLabel}
              </Link>
              {secondaryHref && secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {paragraph}
                </p>
              ))}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Why people use it</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                {highlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Frequently asked</h2>
            <div className="mt-5 space-y-4">
              {faq.map((item) => (
                <div key={item.question} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Explore more AIWoven tools</h2>
            <div className="mt-5 grid gap-3">
              {relatedLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 transition hover:border-blue-200 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
