type StepCard = {
  title: string;
  description: string;
};

export function HowItWorksSteps({
  title,
  intro,
  steps,
}: {
  title: string;
  intro: string;
  steps: StepCard[];
}) {
  return (
    <section className="mt-16">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base leading-8 text-slate-500">{intro}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-lg font-semibold text-blue-700">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">{step.title}</h3>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
