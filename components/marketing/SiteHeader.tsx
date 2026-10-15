"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { AIWovenLogo } from "@/components/brand/AIWovenLogo";

export const siteNavLinks = [
  { label: "AI Note Taker", href: "/ai-note" },
  { label: "AI Flashcards", href: "/ai-study" },
  { label: "AI Detector", href: "/ai-detector" },
  { label: "Study Guides", href: "/blog" },
] as const;

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** Public-site header shared by the homepage, blog, and landing pages. */
export function SiteHeader() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountLabel = session ? "Open workspace" : "Log in";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6" aria-label="Main navigation">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="AIWoven home"><AIWovenLogo /></Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            {siteNavLinks.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-slate-900">{link.label}</Link>)}
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/chat" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">{accountLabel}</Link>
          <Link href="/chat" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Try for free <ArrowIcon /></Link>
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 lg:hidden sm:ml-auto" aria-label="Toggle navigation menu" aria-expanded={menuOpen} aria-controls="site-mobile-menu" onClick={() => setMenuOpen((value) => !value)}>
          <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d={menuOpen ? "m5 5 10 10M15 5 5 15" : "M3.5 6h13M3.5 10h13M3.5 14h13"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </button>
      </nav>
      {menuOpen ? (
        <div id="site-mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
          <div className="grid gap-1">
            {siteNavLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
            <Link href="/chat" className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:hidden">{accountLabel}</Link>
            <Link href="/chat" className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:hidden">Try for free</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
