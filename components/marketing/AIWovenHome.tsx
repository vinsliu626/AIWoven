import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { getBlogPost, getBlogPostUrl, getReadingTime } from "@/lib/blog/posts";
import type { BlogPost } from "@/lib/blog/types";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

type ToolIcon = "chat" | "note" | "study" | "detect" | "humanizer" | "converter";

const tools: Array<{ title: string; cta: string; description: string; href: string; icon: ToolIcon; tag: string }> = [
  { title: "AI Note Taker", cta: "Turn audio into notes", description: "Record a lecture in the browser or upload audio, then get transcribed, structured study notes with definitions and key takeaways.", href: "/ai-note", icon: "note", tag: "Lectures" },
  { title: "AI Flashcards & Quizzes", cta: "Make flashcards", description: "Upload a PDF, DOCX, or PPTX and generate notes, flashcards, or quizzes with an explanation for every answer.", href: "/ai-study", icon: "study", tag: "Documents" },
  { title: "AI Detector", cta: "Check a draft", description: "Get an AI-likelihood breakdown and highlighted passages to review—one signal, not proof of authorship.", href: "/ai-detector", icon: "detect", tag: "Writing" },
  { title: "AI Humanizer", cta: "Smooth your wording", description: "Lightly revise stiff phrasing for clearer, more natural flow while keeping your original meaning.", href: "/ai-humanizer", icon: "humanizer", tag: "Writing" },
  { title: "AI Study Assistant Chat", cta: "Ask a question", description: "Ask questions, draft explanations, or run a plan–write–review workflow on harder problems.", href: "/chat", icon: "chat", tag: "Assistant" },
  { title: "File Converter", cta: "Convert a file", description: "Convert between PDF, JPG, PNG, and WEBP when course files arrive in the wrong format.", href: "/converter", icon: "converter", tag: "Files" },
];

const guideSlugs = [
  "turn-lecture-recordings-into-study-notes",
  "active-recall-vs-rereading",
  "how-to-study-for-exams-with-ai",
  "turn-class-notes-into-flashcards",
  "how-accurate-are-ai-detectors",
  "create-study-guide-from-lecture-notes",
] as const;

const workflow = [
  ["Lecture", "Capture"],
  ["AI Notes", "Organize"],
  ["Flashcards", "Recall"],
  ["Explained Quiz", "Understand"],
  ["Review", "Improve"],
] as const;

const studentNeeds = [
  {
    stage: "Listen",
    title: "Stay focused during lectures",
    body: "I want to understand the lecture without typing every word the professor says.",
    capability: "Record → AI Notes",
  },
  {
    stage: "Organize",
    title: "Make notes easier to review",
    body: "I need my recordings and documents turned into clear key points, not another wall of text.",
    capability: "Organized Notes",
  },
  {
    stage: "Practice",
    title: "Study actively, not passively",
    body: "I remember more when I can flip through flashcards and test myself instead of rereading pages.",
    capability: "Flashcards + Quiz",
  },
  {
    stage: "Understand",
    title: "Understand every mistake",
    body: "A score is not enough. I need to know why my answer was wrong and how to improve it.",
    capability: "Explained Answers",
  },
] as const;

const trustPillars = [
  {
    title: "Private by default",
    body: "Private tools require authentication, study history is tied to your account, and public analytics only expose aggregate counts.",
  },
  {
    title: "Built for reliability",
    body: "Upload integrity checks, resumable jobs, and automatic provider fallback keep long-running work moving.",
  },
  {
    title: "Transparent results",
    body: "Detector reports show the full probability breakdown, and every quiz answer comes with an explanation.",
  },
] as const;

const faqs = [
  ["Is AIWoven free to use?", "Yes. AIWoven has a free Basic plan with weekly and daily usage limits. Paid plans raise those limits."],
  ["Can AIWoven turn a lecture recording into notes?", "Yes. AI Note accepts common audio formats (such as MP3, M4A, WAV, and WEBM) or a recording made in your browser, transcribes it, and organizes it into study notes. Always check names, numbers, and formulas against your slides."],
  ["Which AI tools are included?", "AI Chat, AI Note, AI Study, Flashcards, explained Quizzes, AI Detector, Humanizer, and File Converter are available in the workspace."],
  ["Can I upload lecture notes or documents?", "Yes. AI Study accepts supported PDF, DOCX, and PPTX documents and extracts text in the browser before generation."],
  ["How does AI Study create flashcards and quizzes?", "It uses the document text to generate structured notes, large interactive flashcards, and a separate question-by-question quiz flow."],
  ["Does every quiz answer include an explanation?", "Yes. New quiz items are validated to include an explanation, and incorrect answers show your answer, the correct answer, and the explanation."],
  ["Is my uploaded content private?", "Private tools require authentication. AI Study history is tied to your account, and public analytics expose only aggregate counts—not identities or event details."],
  ["What powers AIWoven Assistant?", "AIWoven routes requests through supported AI systems selected for the task. The active provider and model are intentionally not exposed in the workspace."],
] as const;

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" aria-hidden className={className}><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" aria-hidden className={className}><path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ToolGlyph({ name }: { name: ToolIcon }) {
  const paths: Record<ToolIcon, ReactNode> = {
    chat: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    note: <><path d="M6.5 3.5h8l3 3v14h-11z" /><path d="M14.5 3.5v4h4M9.5 11h5M9.5 14h5M9.5 17h3" /></>,
    detect: <><circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4M11 8v6M8 11h6" /></>,
    study: <><path d="m3.5 6 8.5-3 8.5 3-8.5 3z" /><path d="M6 8.2v5.3c2.7 2 9.3 2 12 0V8.2M20.5 6v6" /></>,
    humanizer: <><path d="M12 3.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9Z" /><path d="M9.5 18h5M10.5 21h3" /></>,
    converter: <><path d="M5 7h13l-3-3M19 17H6l3 3" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, body, center = false, id }: { eyebrow: string; title: string; body?: string; center?: boolean; id?: string }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold text-blue-600">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-pretty text-base leading-7 text-slate-600">{body}</p> : null}
    </div>
  );
}

function StudentNeeds() {
  return (
    <section id="student-needs" aria-labelledby="student-needs-title" data-testid="student-needs" className="scroll-mt-24 bg-slate-50 px-4 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <SectionHeading eyebrow="Student needs" title="Built around the way students actually study." id="student-needs-title" />
          <p className="max-w-xl text-base leading-7 text-slate-600 lg:justify-self-end">AIWoven connects the moments students usually lose between listening, organizing, reviewing, and preparing for exams.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {studentNeeds.map((need, index) => (
            <article key={need.title} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-700">{index + 1}</span>
                <span className="text-xs font-semibold uppercase tracking-[.06em] text-slate-400">{need.stage}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{need.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-6 text-slate-600">“{need.body}”</p>
              <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                {need.capability}
              </span>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-700">One workspace for the full path from lecture to mastery.</p>
          <a href="#workflow" data-testid="student-needs-workflow-link" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">See how it works <span className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"><ArrowIcon /></span></a>
        </div>

      </div>
    </section>
  );
}

function ProductStage() {
  return (
    <div className="relative mx-auto w-full" aria-label="AIWoven multi-agent workspace preview" data-testid="hero-product-stage">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-100/70 via-indigo-50 to-violet-100/60 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /></div>
          <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-0.5 text-[11px] text-slate-400 sm:flex">aiwoven.app/workspace</div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600"><span className="aiwoven-status-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</div>
        </div>

        <div className="grid md:grid-cols-[1.1fr_.9fr]">
          <div className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-blue-600">Multi-step workflow</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">Lecture synthesis</h3>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Running</span>
            </div>

            <ol className="relative mt-4 space-y-2.5 before:absolute before:bottom-5 before:left-[13px] before:top-4 before:w-px before:bg-slate-200">
              <li className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon className="h-3.5 w-3.5" /></span>
                <div className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-slate-900">Planner</p><span className="text-[11px] text-emerald-600">Complete</span></div><p className="mt-1 text-[12px] leading-5 text-slate-500">Map the recording into notes, recall prompts, and an explained assessment.</p></div>
              </li>
              <li className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 border-blue-600 bg-white"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /></span>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3"><div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-slate-900">Reviewer</p><span className="text-[11px] text-blue-600">Checking sources</span></div><div className="mt-2 space-y-1.5"><span className="block h-1.5 w-[92%] rounded bg-blue-100" /><span className="block h-1.5 w-[68%] rounded bg-blue-100" /></div></div>
              </li>
              <li className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-400">3</span>
                <div className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-slate-900">Final output</p><span className="text-[11px] text-slate-400">Queued</span></div><p className="mt-1 text-[12px] font-medium text-slate-700">Photosynthesis study set</p><div className="mt-2 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Notes</span><span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">12 cards</span><span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">8 questions</span></div></div>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-2.5 bg-slate-50/60 p-3 md:grid-cols-1">
            <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-3 md:col-span-1"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-blue-600">Record → AI Notes</p><span className="text-[11px] tabular-nums text-slate-400">06:42</span></div><p className="mt-1.5 text-[12px] font-semibold text-slate-900">Light-dependent reactions</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">ATP and NADPH carry captured light energy into the Calvin cycle.</p></div>
            <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[11px] font-semibold text-slate-500">AI Detect</p><p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">12%</p><div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="w-[12%] bg-amber-400" /><span className="w-[88%] bg-emerald-400" /></div><p className="mt-1.5 text-[10px] leading-4 text-slate-500">Likely human-written</p></div>
            <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-slate-500">Flashcard</p><span className="text-[10px] tabular-nums text-slate-400">4 / 12</span></div><p className="mt-2 text-[12px] font-medium leading-4 text-slate-900">Where do light reactions occur?</p><p className="mt-2 text-[10px] text-blue-600">Flip to reveal</p></div>
            <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-3 md:col-span-1"><div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-slate-900">Explained quiz</p><span className="text-[11px] text-emerald-600">Answer reviewed</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[62%] rounded-full bg-blue-600" /></div><p className="mt-1.5 text-[11px] leading-4 text-slate-500">Correct answer and explanation stay linked.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetectorShowcase() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-slate-400">Detection report</p>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Likely AI-generated</span>
      </div>
      <p className="mt-4 text-[15px] font-semibold text-slate-900">We are highly confident this text was AI-generated.</p>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100"><span className="w-[78%] bg-amber-400" /><span className="w-[14%] bg-violet-400" /><span className="w-[8%] bg-emerald-400" /></div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[["78%", "AI", "bg-amber-400"], ["14%", "Mixed", "bg-violet-400"], ["8%", "Human", "bg-emerald-400"]].map(([value, label, color]) => (
          <div key={label} className="rounded-lg bg-slate-50 py-3"><dd className="text-lg font-semibold tabular-nums text-slate-900">{value}</dd><dt className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-slate-500"><span className={`h-2 w-2 rounded-sm ${color}`} />{label}</dt></div>
        ))}
      </dl>
      <p className="mt-5 rounded-lg border border-slate-200 p-3 text-[13px] leading-6 text-slate-600">
        <mark className="rounded-sm bg-amber-200/80 px-0.5 text-slate-900">Furthermore, it is essential to recognize that effective communication plays a crucial role.</mark> I rewrote the intro after talking with my lab partner about our results.
      </p>
    </div>
  );
}

function StudyShowcase() {
  return (
    <div className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)]">
        <span className="text-xs font-semibold uppercase tracking-[.06em] text-blue-600">Flashcard</span>
        <p className="mt-5 max-w-sm text-xl font-semibold leading-8 text-slate-900">How do ATP and NADPH support the Calvin cycle?</p>
        <p className="mt-6 text-xs text-slate-400">Click or press Space to flip</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Question 3 of 8</span><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Correct</span></div>
        <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[38%] rounded-full bg-blue-600" /></div>
        <p className="mt-6 text-sm font-semibold text-slate-900">Why is this correct?</p>
        <p className="mt-2 text-[13px] leading-6 text-slate-600">ATP supplies energy while NADPH provides reducing power for carbon fixation and carbohydrate synthesis.</p>
      </div>
    </div>
  );
}

function GuideCard({ post }: { post: BlogPost }) {
  return (
    <Link href={getBlogPostUrl(post.slug)} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md motion-reduce:transform-none">
      <span className="text-xs font-semibold uppercase tracking-[.06em] text-blue-600">{post.category}</span>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900">{post.title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-6 text-slate-600">{post.description}</p>
      <span className="mt-5 flex items-center justify-between text-sm">
        <span className="text-slate-400">{getReadingTime(post)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-blue-600">Read guide <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span></span>
      </span>
    </Link>
  );
}

function homeJsonLd() {
  const site = absoluteUrl("/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}#organization`,
        name: "AIWoven",
        url: site,
        logo: absoluteUrl("/icon.svg"),
      },
      {
        "@type": "WebSite",
        "@id": `${site}#website`,
        name: "AIWoven",
        url: site,
        publisher: { "@id": `${site}#organization` },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${site}#faq`,
        mainEntity: faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}

export function AIWovenHome() {
  const guides = guideSlugs.map((slug) => getBlogPost(slug)).filter((post): post is BlogPost => Boolean(post));

  return (
    <>
    <SiteHeader />
    <main className="aiwoven-site min-h-screen overflow-x-clip bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeJsonLd()) }} />

      <section className="aiwoven-hero-bg relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pb-20 lg:pt-16" aria-labelledby="hero-title">
        <div className="aiwoven-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              AI study assistant for students
            </p>
            <h1 id="hero-title" className="mx-auto mt-5 max-w-2xl text-balance text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-[3.25rem] lg:mx-0 lg:text-[3.6rem]">
              Turn <span className="aiwoven-highlight">lectures</span> into notes, flashcards, and quizzes.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">
              Record or upload a lecture and AIWoven transcribes it into structured study notes. Upload slides or readings to generate flashcards and explained quizzes—then review it all in one workspace.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/chat" data-testid="hero-primary-cta" className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.55)] transition hover:bg-blue-700 sm:w-auto">Try for free <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span></Link>
              <Link href="/ai-note" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto">Turn a lecture into notes</Link>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500 lg:justify-start">
              {["No credit card required", "Free plan", "Private by default"].map((item) => <li key={item} className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-600" />{item}</li>)}
            </ul>
          </div>
          <div className="min-w-0 lg:ml-auto lg:w-full lg:max-w-[720px]"><ProductStage /></div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-8 sm:px-6" aria-label="Who uses AIWoven">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-slate-500">Designed for every part of academic work</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px] font-semibold text-slate-400">
            {["Students", "Educators", "Researchers", "Writers", "Study groups"].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section id="tools" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="tools-title">
        <div id="features" className="mx-auto max-w-6xl scroll-mt-20">
          <SectionHeading eyebrow="Study tools" title="Everything between the lecture and the exam." body="Focused tools that share one account and one history, so the notes you make after class become the flashcards and quizzes you review before the exam." center id="tools-title" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <Link key={tool.title} href={tool.href} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md motion-reduce:transform-none">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><ToolGlyph name={tool.icon} /></span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{tool.tag}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-6 text-slate-600">{tool.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">{tool.cta} <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StudentNeeds />

      <section id="workflow" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="workflow-title">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Student workflow" title="One continuous path from class to recall." body="Each step keeps the context from the step before it, so studying feels like one workflow instead of five disconnected tools." center id="workflow-title" />
          <ol className="relative mt-14 grid gap-6 sm:grid-cols-5 sm:gap-4">
            <li className="absolute left-5 top-5 bottom-5 w-px bg-slate-200 sm:left-[10%] sm:right-[10%] sm:top-5 sm:bottom-auto sm:h-px sm:w-auto" aria-hidden role="presentation" />
            {workflow.map(([item, detail], index) => (
              <li key={item} className="relative flex items-center gap-4 sm:flex-col sm:text-center">
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-200 bg-white text-sm font-semibold text-blue-700 shadow-sm">{index + 1}</span>
                <div className="sm:mt-2"><p className="text-[15px] font-semibold text-slate-900">{item}</p><p className="mt-0.5 text-sm text-slate-500">{detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:py-20" aria-label="Product highlights">
        <div className="mx-auto grid max-w-6xl gap-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading eyebrow="AI Detector" title="A detection report you can actually act on." body="Paste a draft and get an overall probability, a three-way breakdown, and the exact passages that look AI-written—so you know what to revise." />
              <ul className="mt-6 space-y-3 text-[15px] text-slate-700">
                {["Sentence-level highlighting", "AI · Mixed · Human probability breakdown", "Clear verdicts with responsible-use guidance"].map((item) => <li key={item} className="flex items-center gap-2.5"><CheckIcon className="h-4 w-4 text-blue-600" />{item}</li>)}
              </ul>
              <Link href="/ai-detector" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">Try the AI Detector <ArrowIcon /></Link>
            </div>
            <DetectorShowcase />
          </div>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="lg:order-2">
              <SectionHeading eyebrow="AI Study" title="Study the explanation, not just the score." body="Upload a lecture document, then move through notes, large 3D flashcards, and a focused quiz route that explains every answer." />
              <Link href="/ai-study" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">Open AI Study <ArrowIcon /></Link>
            </div>
            <div className="lg:order-1"><StudyShowcase /></div>
          </div>
        </div>
      </section>

      <section id="trust" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="trust-title">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Why AIWoven" title="Serious tools for serious work." body="Built with the safeguards you expect from professional software—so you can rely on it the night before a deadline." center id="trust-title" />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {trustPillars.map((pillar, index) => (
              <div key={pillar.title} className="rounded-2xl border border-slate-200 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-white">
                  {index === 0 ? <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" /><rect x="5" y="10" width="14" height="10" rx="2.5" /></svg>
                    : index === 1 ? <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
                    : <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 20V10M12 20V4M19 20v-7M3 20h18" /></svg>}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{pillar.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-slate-600">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="guides" className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="guides-title">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Study guides" title="Learn the method, then let the tools do the busywork." id="guides-title" />
            <Link href="/blog" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">All guides <ArrowIcon /></Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((post) => <GuideCard key={post.slug} post={post} />)}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="faq-title">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" body="Everything you need to know before weaving AIWoven into your study routine." id="faq-title" />
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group px-5 py-4 open:bg-slate-50/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-semibold text-slate-900">
                  <span>{question}</span>
                  <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </summary>
                <p className="max-w-2xl pt-3 text-[15px] leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_45%)]" aria-hidden />
          <h2 className="relative mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">Turn your next lecture into something you’ll actually remember.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-blue-100">Start free in seconds. No credit card required.</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/chat" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">Try for free <ArrowIcon /></Link>
            <Link href="/ai-note" className="inline-flex h-12 items-center rounded-lg border border-white/30 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10">Turn a lecture into notes</Link>
          </div>
        </div>
      </section>

    </main>
    <SiteFooter />
    </>
  );
}
