import Link from "next/link";

import { formatBlogDate } from "@/components/blog/BlogArticlePage";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { blogPosts, getBlogCategories, getBlogPostUrl, getReadingTime } from "@/lib/blog/posts";
import type { BlogPost } from "@/lib/blog/types";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

/** Display order for categories; anything else follows alphabetically. */
const CATEGORY_ORDER = ["Lecture Notes", "Study Skills", "AI Detection", "Note Taking", "Study Tools", "AI Writing", "Student Productivity", "File Conversion"];

function PostRow({ post }: { post: BlogPost }) {
  return (
    <li>
      <Link href={getBlogPostUrl(post.slug)} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
        <span className="text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-blue-700">{post.title}</span>
        <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">{post.description}</span>
        <span className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <time dateTime={post.updated ?? post.date}>{formatBlogDate(post.updated ?? post.date)}</time>
          <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{getReadingTime(post)}</span>
        </span>
      </Link>
    </li>
  );
}

export function BlogIndexPage() {
  const categories = getBlogCategories().sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name);
    const bi = CATEGORY_ORDER.indexOf(b.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
  });

  const collectionLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${absoluteUrl("/blog")}#collection`,
        name: "AIWoven study guides",
        url: absoluteUrl("/blog"),
        description: "Practical guides on lecture notes, active recall, exam preparation, and AI detection for students.",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: blogPosts.map((post, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(getBlogPostUrl(post.slug)), name: post.title })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Study guides", item: absoluteUrl("/blog") },
        ],
      },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-white text-slate-900">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionLd) }} />

        <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-6xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-sm text-slate-500">
                <li><Link href="/" className="hover:text-slate-900">Home</Link></li>
                <li aria-hidden className="text-slate-300">/</li>
                <li aria-current="page" className="text-slate-700">Study guides</li>
              </ol>
            </nav>
            <h1 className="mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.6rem] sm:leading-[1.15]">Study guides for lectures, notes, and exams</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Practical, evidence-aware guides on turning lectures into notes, studying with active recall, preparing for exams, and understanding what AI detectors can and cannot tell you.
            </p>
            <nav aria-label="Guide categories" className="mt-7">
              <ul className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <a href={`#${category.id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
                      {category.name}
                      <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{category.count}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6">
          {categories.map((category) => (
            <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`} className="scroll-mt-24">
              <h2 id={`${category.id}-title`} className="text-2xl font-semibold tracking-tight text-slate-900">{category.name}</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {blogPosts.filter((post) => post.category === category.name).map((post) => <PostRow key={post.slug} post={post} />)}
              </ul>
            </section>
          ))}

          <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Put a guide into practice</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-blue-100">Turn your next lecture into structured notes, or a set of slides into flashcards and an explained quiz.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/ai-note" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">Open AI Note</Link>
              <Link href="/ai-study" className="inline-flex h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Open AI Study</Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
