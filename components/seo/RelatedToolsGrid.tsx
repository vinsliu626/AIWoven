import Link from "next/link";

type RelatedToolCard = {
  href: string;
  title: string;
  description: string;
  category: string;
};

export function RelatedToolsGrid({
  title,
  cards,
}: {
  title: string;
  cards: RelatedToolCard[];
}) {
  return (
    <section className="mt-16">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base leading-8 text-slate-500">
          Move between writing review, study prep, note cleanup, and file tasks without rebuilding context from scratch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[.06em] text-slate-500">{card.category}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{card.title}</h3>
              </div>
              <span className="text-lg text-slate-500 transition group-hover:translate-x-1 group-hover:text-blue-700">↗</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
