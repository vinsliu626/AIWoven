import Link from "next/link";

import type { BlogPost } from "@/lib/blog/posts";
import { getBlogPostUrl, getRelatedBlogPosts } from "@/lib/blog/posts";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function BlogArticlePage({ post }: { post: BlogPost }) {
  const relatedPosts = getRelatedBlogPosts(post.slug);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />

      <div className="relative mx-auto max-w-5xl space-y-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-800">
            Home
          </Link>
          <span className="px-2 text-slate-400">/</span>
          <Link href="/blog" className="transition hover:text-slate-800">
            Blog
          </Link>
          <span className="px-2 text-slate-400">/</span>
          <span className="text-slate-600">{post.title}</span>
        </nav>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)]">
          <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 px-6 py-8 sm:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[.06em] text-slate-500">
              <span>{post.category}</span>
              <span className="h-1 w-1 rounded-full bg-slate-200" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="h-1 w-1 rounded-full bg-slate-200" />
              <span>{post.readingTime}</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{post.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{post.description}</p>
          </header>

          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="max-w-none">
                <p className="text-base leading-8 text-slate-600">{post.intro}</p>
              </div>

              <div className="mt-10 space-y-10">
                {post.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{section.heading}</h2>
                    <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-600 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} dangerouslySetInnerHTML={{ __html: paragraph }} />
                      ))}
                    </div>

                    {section.bullets?.length ? (
                      <ul className="mt-5 space-y-3 text-[15px] leading-8 text-slate-600">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3">
                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {section.toolLinks?.length ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {section.toolLinks.map((link) => (
                          <Link
                            key={`${section.heading}-${link.href}`}
                            href={link.href}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 transition hover:border-blue-200 hover:bg-slate-100"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>

              <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{post.ctaTitle}</h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-8 text-slate-600">{post.ctaDescription}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {post.ctaLinks.map((link, index) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={
                        index === 0
                          ? "inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition"
                          : "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 transition hover:bg-slate-100"
                      }
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Related AIWoven tools</h2>
                <div className="mt-4 grid gap-3">
                  {post.ctaLinks.map((link) => (
                    <Link
                      key={`aside-${link.href}`}
                      href={link.href}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 transition hover:border-blue-200 hover:bg-slate-50"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">More articles</h2>
                <div className="mt-4 space-y-3">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.slug}
                      href={getBlogPostUrl(relatedPost.slug)}
                      className="block rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 transition hover:border-emerald-200 hover:bg-slate-50"
                    >
                      <span className="block font-medium text-slate-900">{relatedPost.title}</span>
                      <span className="mt-2 block text-xs uppercase tracking-[.06em] text-slate-500">{relatedPost.category}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
