import Link from "next/link";

import { blogPosts, getBlogPostUrl } from "@/lib/blog/posts";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function BlogIndexPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-12 text-slate-900 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />

      <div className="relative mx-auto max-w-6xl space-y-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 px-6 py-8 sm:px-8">
            <p className="text-[11px] uppercase tracking-[.06em] text-slate-500">AIWoven Blog</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Practical AI guides for students
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Useful articles on studying, note-taking, AI writing review, and file workflows. Every post connects back to
              the tools students actually use inside AIWoven.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ai-study"
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition"
              >
                Try AIWoven for free
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                Back to homepage
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)] transition hover:border-blue-200 hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[.06em] text-slate-500">
                <span>{post.category}</span>
                <span className="h-1 w-1 rounded-full bg-slate-200" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span className="h-1 w-1 rounded-full bg-slate-200" />
                <span>{post.readingTime}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                <Link href={getBlogPostUrl(post.slug)} className="transition hover:text-blue-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">{post.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={getBlogPostUrl(post.slug)}
                  className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition"
                >
                  Read article
                </Link>
                <Link
                  href={post.relatedToolUrl}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition hover:border-emerald-200 hover:bg-slate-50"
                >
                  Related tool
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

