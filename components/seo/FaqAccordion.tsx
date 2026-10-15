type FaqItem = {
  question: string;
  answer: string;
};

export function FaqAccordion({
  title,
  items,
}: {
  title: string;
  items: FaqItem[];
}) {
  return (
    <section className="mt-16">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base leading-8 text-slate-500">
          Direct answers for the decisions students, educators, and busy teams usually need to make before they trust a tool.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <span className="text-lg font-semibold tracking-tight text-slate-900">{item.question}</span>
              <span className="text-slate-500 transition group-open:rotate-45 group-open:text-blue-700">+</span>
            </summary>
            <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
