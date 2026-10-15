import Link from "next/link";

import { AIWovenLogo, AIWovenMark } from "@/components/brand/AIWovenLogo";

const footerGroups = [
  {
    title: "Study tools",
    links: [
      ["AI Note Taker", "/ai-note"],
      ["AI Flashcards & Quizzes", "/ai-study"],
      ["Flashcards", "/flashcards"],
      ["Quiz Me", "/quiz-me"],
    ],
  },
  {
    title: "Writing tools",
    links: [
      ["AI Detector", "/ai-detector"],
      ["AI Humanizer", "/ai-humanizer"],
      ["AI Chat", "/chat"],
      ["File Converter", "/converter"],
    ],
  },
  {
    title: "Guides",
    links: [
      ["All study guides", "/blog"],
      ["Lecture recordings to notes", "/blog/turn-lecture-recordings-into-study-notes"],
      ["Active recall vs rereading", "/blog/active-recall-vs-rereading"],
      ["How accurate are AI detectors?", "/blog/how-accurate-are-ai-detectors"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Privacy policy", "/privacy"],
      ["Log in", "/chat"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <AIWovenLogo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">AI study assistant for turning lectures and course documents into notes, flashcards, and quizzes.</p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="text-sm font-semibold text-slate-900">{group.title}</p>
            <ul className="mt-3 space-y-2">
              {group.links.map(([label, href]) => <li key={href + label}><Link href={href} className="text-sm text-slate-500 transition hover:text-slate-900">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} AIWoven. All rights reserved.</p>
        <div className="flex items-center gap-2"><AIWovenMark className="h-4 w-5" title="" /> Built for learners.</div>
      </div>
    </footer>
  );
}
