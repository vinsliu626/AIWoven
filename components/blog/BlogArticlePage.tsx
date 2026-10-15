import Link from "next/link";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import type { BlogBlock, BlogPost } from "@/lib/blog/posts";
import { getBlogPostUrl, getReadingTime, getRelatedBlogPosts, slugifyHeading } from "@/lib/blog/posts";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

const proseLinks = "[&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4 hover:[&_a]:decoration-blue-600 [&_strong]:font-semibold [&_strong]:text-slate-900";

const calloutTone = {
  note: { box: "border-blue-200 bg-blue-50/70", title: "text-blue-900" },
  tip: { box: "border-emerald-200 bg-emerald-50/70", title: "text-emerald-900" },
  warning: { box: "border-amber-200 bg-amber-50/80", title: "text-amber-900" },
} as const;

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "p":
      return <p dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-slate-400">
          {block.items.map((item) => <li key={item} className="pl-1" dangerouslySetInnerHTML={{ __html: item }} />)}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-slate-500">
          {block.items.map((item) => <li key={item} className="pl-1" dangerouslySetInnerHTML={{ __html: item }} />)}
        </ol>
      );
    case "table":
      return (
        <div className="-mx-1 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px] leading-6">
            <caption className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-700">{block.caption}</caption>
            <thead>
              <tr className="border-b border-slate-200">
                {block.headers.map((header) => <th key={header} scope="col" className="px-4 py-2.5 font-semibold text-slate-900">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-slate-100 last:border-0 align-top">
                  {row.map((cell, index) => index === 0
                    ? <th key={index} scope="row" className="px-4 py-2.5 font-medium text-slate-900" dangerouslySetInnerHTML={{ __html: cell }} />
                    : <td key={index} className="px-4 py-2.5 text-slate-600" dangerouslySetInnerHTML={{ __html: cell }} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <aside className={`rounded-xl border p-4 sm:p-5 ${calloutTone[block.tone].box}`}>
          <p className={`text-[15px] font-semibold ${calloutTone[block.tone].title}`}>{block.title}</p>
          <p className="mt-1.5 text-[15px] leading-7 text-slate-700" dangerouslySetInnerHTML={{ __html: block.html }} />
        </aside>
      );
    case "example":
      return (
        <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <figcaption className="border-b border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700">{block.title}</figcaption>
          <div className="space-y-1.5 px-4 py-3 font-mono text-[13px] leading-6 text-slate-700">
            {block.lines.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line || " "}</p>)}
          </div>
        </figure>
      );
  }
}

function articleJsonLd(post: BlogPost) {
  const url = absoluteUrl(getBlogPostUrl(post.slug));
  const site = absoluteUrl("/");
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.seoDescription,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      inLanguage: "en",
      mainEntityOfPage: url,
      url,
      image: absoluteUrl("/brand/aiwoven-image2-concept.png"),
      articleSection: post.category,
      keywords: post.tags?.join(", "),
      author: { "@type": "Organization", name: "AIWoven", url: site },
      publisher: { "@type": "Organization", name: "AIWoven", url: site, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
      ...(post.references?.length ? { citation: post.references.map((ref) => ({ "@type": "CreativeWork", name: ref.title, url: ref.url })) } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Study guides", item: absoluteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: post.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function BlogArticlePage({ post }: { post: BlogPost }) {
  const relatedPosts = getRelatedBlogPosts(post.slug);
  const toc = post.sections.map((section) => ({ id: slugifyHeading(section.heading), heading: section.heading }));
  if (post.faqs?.length) toc.push({ id: "faq", heading: "Frequently asked questions" });
  if (post.references?.length) toc.push({ id: "sources", heading: "Sources" });

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white text-slate-900">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd(post)) }} />

        <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
          <div className="mx-auto max-w-6xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                <li><Link href="/" className="hover:text-slate-900">Home</Link></li>
                <li aria-hidden className="text-slate-300">/</li>
                <li><Link href="/blog" className="hover:text-slate-900">Study guides</Link></li>
                <li aria-hidden className="text-slate-300">/</li>
                <li><Link href={`/blog#${slugifyHeading(post.category)}`} className="hover:text-slate-900">{post.category}</Link></li>
              </ol>
            </nav>
            <h1 className="mt-5 max-w-4xl text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.6rem] sm:leading-[1.15]">{post.title}</h1>
            <p className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-slate-600">{post.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span>By <span className="font-medium text-slate-700">AIWoven</span></span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
              <span>Published <time dateTime={post.date}>{formatBlogDate(post.date)}</time></span>
              {post.updated && post.updated !== post.date ? (
                <>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>Updated <time dateTime={post.updated}>{formatBlogDate(post.updated)}</time></span>
                </>
              ) : null}
              <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{getReadingTime(post)}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-w-0 max-w-[720px]">
            <p className={`text-[17px] leading-8 text-slate-700 ${proseLinks}`} dangerouslySetInnerHTML={{ __html: post.intro }} />

            {post.keyTakeaways?.length ? (
              <section aria-labelledby="key-takeaways" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h2 id="key-takeaways" className="text-base font-semibold text-slate-900">Key takeaways</h2>
                <ul className={`mt-3 space-y-2 text-[15px] leading-7 text-slate-700 ${proseLinks}`}>
                  {post.keyTakeaways.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <svg viewBox="0 0 20 20" aria-hidden className="mt-1.5 h-4 w-4 shrink-0 text-blue-600"><path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <details className="mt-8 rounded-xl border border-slate-200 p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">On this page</summary>
              <ol className="mt-3 space-y-2 text-sm">
                {toc.map((item) => <li key={item.id}><a href={`#${item.id}`} className="text-slate-600 hover:text-blue-700">{item.heading}</a></li>)}
              </ol>
            </details>

            <div className="mt-10 space-y-12">
              {post.sections.map((section) => (
                <section key={section.heading} aria-labelledby={slugifyHeading(section.heading)} className="scroll-mt-24">
                  <h2 id={slugifyHeading(section.heading)} className="scroll-mt-24 text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900">{section.heading}</h2>
                  <div className={`mt-4 space-y-5 text-[16.5px] leading-8 text-slate-700 ${proseLinks}`}>
                    {section.paragraphs?.map((paragraph) => <p key={paragraph} dangerouslySetInnerHTML={{ __html: paragraph }} />)}
                    {section.bullets?.length ? (
                      <ul className="list-disc space-y-2 pl-6 marker:text-slate-400">
                        {section.bullets.map((bullet) => <li key={bullet} className="pl-1">{bullet}</li>)}
                      </ul>
                    ) : null}
                    {section.blocks?.map((block, index) => <Block key={index} block={block} />)}
                  </div>
                  {section.toolLinks?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {section.toolLinks.map((link) => (
                        <Link key={`${section.heading}-${link.href}`} href={link.href} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
                          {link.label}
                          <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            {post.faqs?.length ? (
              <section aria-labelledby="faq" className="mt-14">
                <h2 id="faq" className="scroll-mt-24 text-[1.6rem] font-semibold tracking-tight text-slate-900">Frequently asked questions</h2>
                <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">
                  {post.faqs.map((faq) => (
                    <div key={faq.question} className="p-5">
                      <h3 className="text-[16px] font-semibold text-slate-900">{faq.question}</h3>
                      <p className="mt-2 text-[15.5px] leading-7 text-slate-700">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">{post.ctaTitle}</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-blue-100">{post.ctaDescription}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {post.ctaLinks.map((link, index) => (
                  <Link key={link.href} href={link.href} className={index === 0 ? "inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50" : "inline-flex h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>

            {post.references?.length ? (
              <section aria-labelledby="sources" className="mt-14">
                <h2 id="sources" className="scroll-mt-24 text-xl font-semibold tracking-tight text-slate-900">Sources</h2>
                <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-[14.5px] leading-6 text-slate-600 marker:text-slate-400">
                  {post.references.map((ref) => (
                    <li key={ref.url} className="pl-1">
                      <a href={ref.url} rel="noopener noreferrer" target="_blank" className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-blue-600">{ref.title}</a>
                      <span>. {ref.publisher}{ref.year ? `, ${ref.year}` : ""}.</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </article>

          <aside className="hidden lg:block" aria-label="Article navigation">
            <div className="sticky top-24 space-y-8">
              <nav aria-label="On this page">
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-slate-400">On this page</p>
                <ol className="mt-3 space-y-2 border-l border-slate-200 text-[13.5px] leading-5">
                  {toc.map((item) => <li key={item.id}><a href={`#${item.id}`} className="-ml-px block border-l border-transparent pl-3 text-slate-600 hover:border-blue-600 hover:text-blue-700">{item.heading}</a></li>)}
                </ol>
              </nav>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Try it in AIWoven</p>
                <div className="mt-3 grid gap-2">
                  {post.ctaLinks.map((link) => <Link key={`aside-${link.href}`} href={link.href} className="rounded-lg bg-slate-50 px-3 py-2 text-[13.5px] font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{link.label} →</Link>)}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section aria-labelledby="related-articles" className="border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 id="related-articles" className="text-2xl font-semibold tracking-tight text-slate-900">Related guides</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={getBlogPostUrl(related.slug)} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                  <span className="text-xs font-semibold uppercase tracking-[.06em] text-blue-600">{related.category}</span>
                  <span className="mt-2 text-[16px] font-semibold leading-snug text-slate-900 group-hover:text-blue-700">{related.title}</span>
                  <span className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{related.description}</span>
                  <span className="mt-4 text-xs text-slate-400">{getReadingTime(related)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
