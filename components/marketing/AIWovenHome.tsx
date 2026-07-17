"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRef, useState, type PointerEvent } from "react";

import { AIWovenLogo, AIWovenMark } from "@/components/brand/AIWovenLogo";
import type { PublicImpactStats } from "@/lib/analytics/publicStats";

const tools = [
  ["Chat", "Compare ideas and draft with AIWoven Assistant."],
  ["AI Note", "Turn recordings and text into structured, review-ready notes."],
  ["AI Study", "Build notes, large flashcards, and explained quizzes from documents."],
  ["Detector", "Inspect AI-like writing patterns and suspicious passages."],
  ["Humanizer", "Improve flow and readability while preserving meaning."],
  ["Converter", "Move between PDF, JPG, PNG, WEBP, and supported formats."],
] as const;

const workflow = ["Lecture", "AI Notes", "Flashcards", "Explained Quiz", "Review"] as const;

const faqs = [
  ["Is AIWoven free to use?", "Yes. AIWoven has a Basic plan with usage limits, while paid plans increase limits and unlock additional capacity."],
  ["Which AI tools are included?", "AI Chat, AI Note, AI Study, Flashcards, explained Quizzes, AI Detector, Humanizer, and File Converter are available in the workspace."],
  ["Can I upload lecture notes or documents?", "Yes. AI Study accepts supported PDF, DOCX, and PPTX documents and extracts text in the browser before generation."],
  ["How does AI Study create flashcards and quizzes?", "It uses the document text to generate structured notes, large interactive flashcards, and a separate question-by-question quiz flow."],
  ["Does every quiz answer include an explanation?", "Yes. New quiz items are validated to include an explanation, and incorrect answers show your answer, the correct answer, and the explanation."],
  ["Is my uploaded content private?", "Private tools require authentication. AI Study history is tied to your account, and public analytics expose only aggregate counts—not identities or event details."],
  ["What powers AIWoven Assistant?", "AIWoven routes requests through supported AI systems selected for the task. The active provider and model are intentionally not exposed in the workspace."],
] as const;

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Stat({ value, label }: { value: number; label: string }) {
  const display = value >= 100 ? `${Math.floor(value / 100) * 100}+` : value >= 10 ? `${Math.floor(value / 10) * 10}+` : String(value);
  return <div className="min-w-0 border-l border-white/10 pl-4 sm:pl-6"><p className="font-mono text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">{display}</p><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{label}</p></div>;
}

function ProductStage() {
  return (
    <div className="aiwoven-product-stage relative mx-auto w-full" aria-label="AIWoven multi-agent workspace preview" data-testid="hero-product-stage">
      <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_28%_25%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(circle_at_82%_72%,rgba(139,92,246,0.15),transparent_42%)] blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#080b12]/95 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
        <div className="flex h-11 items-center justify-between border-b border-white/8 px-4">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400/45"/><span className="h-2 w-2 rounded-full bg-amber-300/45"/><span className="h-2 w-2 rounded-full bg-emerald-300/45"/></div>
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-emerald-300"><span className="aiwoven-status-pulse h-1.5 w-1.5 rounded-full bg-emerald-300"/>System online</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">42 ms</div>
        </div>

        <div className="grid min-h-[410px] md:grid-cols-[1.1fr_.9fr]">
          <div className="border-b border-white/8 p-3.5 sm:p-4 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between">
              <div><p className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan-400">Multi-step workflow</p><h3 className="mt-1.5 text-sm font-medium text-white sm:text-base">Lecture synthesis</h3></div>
              <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-slate-400">Running</span>
            </div>

            <div className="relative mt-4 space-y-2.5 before:absolute before:bottom-5 before:left-[13px] before:top-4 before:w-px before:bg-gradient-to-b before:from-cyan-300/50 before:via-violet-400/40 before:to-emerald-300/50">
              <div className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-cyan-300/25 bg-[#0b1420] font-mono text-[8px] text-cyan-300">01</span>
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-cyan-300">Planner</p><span className="text-[8px] text-slate-600">Complete</span></div><p className="mt-2 text-[11px] leading-4 text-slate-300">Map the recording into notes, recall prompts, and an explained assessment.</p></div>
              </div>
              <div className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-violet-300/25 bg-[#121020] font-mono text-[8px] text-violet-300">02</span>
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-violet-300">Reviewer</p><span className="text-[8px] text-slate-600">Checking sources</span></div><div className="mt-2 space-y-1.5"><span className="block h-1 w-[92%] rounded bg-white/10"/><span className="block h-1 w-[68%] rounded bg-white/8"/></div></div>
              </div>
              <div className="relative grid grid-cols-[28px_1fr] gap-3">
                <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-emerald-300/25 bg-[#0b1718] font-mono text-[8px] text-emerald-300">03</span>
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-3"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-emerald-300">Final output</p><span className="text-[8px] text-emerald-300">Ready</span></div><p className="mt-2 text-xs font-medium text-white">Photosynthesis study set</p><div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[8px]"><span className="rounded bg-cyan-300/10 px-2 py-1 text-cyan-300">Notes</span><span className="rounded bg-violet-300/10 px-2 py-1 text-violet-300">12 cards</span><span className="rounded bg-emerald-300/10 px-2 py-1 text-emerald-300">8 questions</span></div></div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 font-mono text-[8px] uppercase tracking-[.16em] text-slate-600"><span>Context woven · 3 tools</span><span className="text-cyan-400">View output →</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-1">
            <div className="col-span-2 rounded-xl border border-white/8 bg-black/20 p-3 sm:p-4 md:col-span-1"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-cyan-400">Record → AI Notes</p><span className="text-[8px] text-slate-600">06:42</span></div><p className="mt-2.5 text-xs font-medium text-white">Light-dependent reactions</p><p className="mt-1.5 text-[10px] leading-4 text-slate-400">ATP and NADPH carry captured light energy into the Calvin cycle.</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-violet-300">AI Detect</p><span className="h-1.5 w-1.5 rounded-full bg-violet-300"/></div><p className="mt-4 text-xl font-semibold tracking-[-.04em] text-white">12%</p><p className="mt-1 text-[9px] leading-4 text-slate-500">AI-like signal in selected passage</p></div>
            <div className="rounded-xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.1),transparent_58%),#0a1019] p-3"><div className="flex items-center justify-between"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-cyan-300">Flashcard</p><span className="text-[8px] text-slate-600">4 / 12</span></div><p className="mt-4 text-[11px] font-medium leading-4 text-white">Where do light reactions occur?</p><p className="mt-3 text-[8px] text-slate-600">Flip to reveal</p></div>
            <div className="col-span-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 md:col-span-1"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-white">Explained quiz</p><span className="text-[8px] text-emerald-300">Answer reviewed</span></div><div className="mt-2.5 h-1 rounded-full bg-white/8"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"/></div><p className="mt-2 text-[9px] leading-4 text-slate-500">Correct answer and explanation stay linked.</p></div>
          </div>
        </div>
      </div>
      <div className="aiwoven-float-card absolute -left-5 bottom-10 hidden rounded-xl border border-cyan-300/15 bg-[#0b1019]/92 px-3 py-2.5 shadow-2xl backdrop-blur-xl xl:block"><p className="font-mono text-[8px] uppercase tracking-widest text-slate-500">Workspace</p><p className="mt-1 text-[11px] text-white">6 tools · one context</p></div>
      <div className="aiwoven-float-card-delayed absolute -right-5 top-24 hidden rounded-xl border border-emerald-300/15 bg-[#0b1019]/92 px-3 py-2.5 shadow-2xl backdrop-blur-xl xl:block"><p className="text-[10px] text-emerald-300">Review complete</p><p className="mt-1 text-[8px] text-slate-500">Explanation attached</p></div>
    </div>
  );
}

export function AIWovenHome({ stats }: { stats: PublicImpactStats }) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 72]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 120]);

  function updateGlow(event: PointerEvent<HTMLElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  }

  const entrance = reduceMotion ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="aiwoven-site min-h-screen overflow-x-clip bg-[#05070c] text-slate-100" onPointerMove={updateGlow}>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/10 bg-[#080b12]/78 px-4 py-2.5 shadow-[0_14px_50px_rgba(0,0,0,.35)] backdrop-blur-xl" aria-label="Main navigation">
          <Link href="/" aria-label="AIWoven home"><AIWovenLogo /></Link>
          <div className="hidden items-center gap-7 text-xs text-slate-400 md:flex">{[["Features","#features"],["Workflow","#workflow"],["AI Tools","#tools"],["FAQ","#faq"]].map(([label,href])=><a key={href} href={href} className="transition hover:text-white">{label}</a>)}</div>
          <div className="hidden items-center gap-2 sm:flex"><Link href="/chat" className="rounded-full px-4 py-2 text-xs text-slate-300 transition hover:text-white">{session ? "Open workspace" : "Log in"}</Link><Link href="/chat" className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200">Try for free <ArrowIcon /></Link></div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 sm:hidden" aria-label="Toggle navigation menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}><span className="text-lg" aria-hidden>{menuOpen?"×":"≡"}</span></button>
        </nav>
        {menuOpen?<div className="mx-auto mt-2 max-w-5xl rounded-3xl border border-white/10 bg-[#080b12]/96 p-4 shadow-2xl backdrop-blur-xl sm:hidden"><div className="grid gap-1">{[["Features","#features"],["Workflow","#workflow"],["AI Tools","#tools"],["FAQ","#faq"]].map(([label,href])=><a key={href} href={href} onClick={()=>setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">{label}</a>)}<Link href="/chat" className="mt-2 rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">Try for free</Link></div></div>:null}
      </header>

      <section ref={heroRef} className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pb-20 lg:pt-24" aria-labelledby="hero-title">
        <div className="aiwoven-grid pointer-events-none absolute inset-0 -z-30" aria-hidden />
        <motion.div style={{ y: glowY }} className="aiwoven-aurora pointer-events-none absolute inset-x-0 top-[-18rem] -z-20 mx-auto h-[60rem] max-w-[90rem]" aria-hidden />
        <div className="aiwoven-pointer-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="aiwoven-particles pointer-events-none absolute inset-0 -z-10" aria-hidden>{Array.from({length:8},(_,index)=><span key={index}/>)}</div>
        <div className="mx-auto grid max-w-[92rem] items-center gap-12 lg:min-h-[540px] lg:grid-cols-[minmax(0,47fr)_minmax(0,53fr)] lg:gap-10 xl:gap-14">
          <div className="text-center lg:text-left">
            <motion.div {...entrance} transition={{duration:.65,ease:[.22,1,.36,1]}} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]"/>Every study tool, woven into one workspace.</motion.div>
            <motion.h1 id="hero-title" {...entrance} transition={{duration:.75,delay:.08,ease:[.22,1,.36,1]}} className="mx-auto mt-5 max-w-2xl text-balance text-[clamp(3.25rem,13vw,5.2rem)] font-semibold leading-[0.9] tracking-[-0.07em] text-white lg:mx-0 lg:text-[clamp(4rem,5.2vw,6.35rem)]">From <span className="aiwoven-highlight font-serif font-normal italic">Lecture</span><br/>to <span className="aiwoven-highlight font-serif font-normal italic">Mastery.</span><br/><span className="text-[.48em] tracking-[-0.05em] text-slate-300">All in One AI Workspace.</span></motion.h1>
            <motion.p {...entrance} transition={{duration:.75,delay:.16,ease:[.22,1,.36,1]}} className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-6 text-slate-400 sm:text-base sm:leading-7 lg:mx-0">Record lectures, organize notes, create flashcards and explained quizzes, improve writing, convert files, and work with AIWoven Assistant—without switching tabs.</motion.p>
            <motion.div {...entrance} transition={{duration:.75,delay:.24,ease:[.22,1,.36,1]}} className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"><Link href="/chat" data-testid="hero-primary-cta" className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-cyan-300 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_45px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200">Try for free <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon/></span></Link><a href="#workflow" className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">See workflow</a></motion.div>
          </div>
          <motion.div style={{ y: stageY }} className="min-w-0 lg:ml-auto lg:w-full lg:max-w-[760px]"><ProductStage /></motion.div>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-y-7 sm:grid-cols-5 lg:mt-12"><Stat value={stats.studentsHelped} label="Students helped"/><Stat value={stats.studySessionsCompleted} label="Study activities"/><Stat value={stats.notesGenerated} label="Notes generated"/><Stat value={stats.flashcardSetsCreated} label="Flashcard sets"/><Stat value={stats.aiToolsAvailable} label="AI tools available"/></div>
      </section>

      <section id="workflow" className="scroll-mt-28 border-y border-white/8 bg-white/[0.018] px-4 py-24 sm:px-6 lg:py-32"><div className="mx-auto max-w-6xl"><div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-400">Student workflow</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white sm:text-5xl">One continuous path from class to recall.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Each step keeps the context from the step before it, so studying feels like one workflow instead of five disconnected tools.</p></div><div className="relative"><div className="absolute left-[1.15rem] top-6 bottom-6 w-px bg-gradient-to-b from-cyan-300 via-violet-400 to-emerald-300 sm:left-0 sm:right-0 sm:top-1/2 sm:h-px sm:w-auto" aria-hidden/><ol className="relative grid gap-4 sm:grid-cols-5 sm:gap-3">{workflow.map((item,index)=><li key={item} className="group flex items-center gap-4 sm:block"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#090d14] font-mono text-xs text-cyan-300 transition group-hover:scale-110 group-hover:border-cyan-300/40">0{index+1}</span><div className="sm:mt-5"><p className="text-sm font-medium text-white">{item}</p><p className="mt-1 text-xs text-slate-500">{index===0?"Capture":index===1?"Organize":index===2?"Recall":index===3?"Understand":"Improve"}</p></div></li>)}</ol></div></div></div></section>

      <section id="features" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:py-32"><div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-violet-400">The connected toolkit</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white sm:text-5xl">Do the whole assignment without rebuilding context.</h2></div><div className="mt-16 grid border-t border-white/10 md:grid-cols-2">{tools.map(([title,description],index)=><Link key={title} href={title==="Chat"?"/chat":title==="AI Note"?"/ai-note":title==="AI Study"?"/ai-study":title==="Detector"?"/ai-detector":title==="Humanizer"?"/ai-humanizer":"/converter"} className={`group relative border-b border-white/10 py-7 transition hover:bg-white/[0.025] md:px-7 ${index%2===0?"md:border-r":""}`}><span className="font-mono text-[10px] text-slate-600">0{index+1}</span><div className="mt-6 flex items-start justify-between gap-8"><div><h3 className="text-xl font-medium text-white">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p></div><span className="mt-1 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300"><ArrowIcon/></span></div></Link>)}</div></div></section>

      <section id="tools" className="scroll-mt-28 px-4 pb-24 sm:px-6 lg:pb-32"><div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,.06),transparent_35%,rgba(139,92,246,.08)),#080b12] p-6 sm:p-10 lg:p-14"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-400">AIWoven workspace</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white">The right workflow for the moment.</h2><p className="mt-5 text-sm leading-7 text-slate-400">Use direct chat or a structured multi-step workflow while AIWoven handles routing behind the scenes.</p><Link href="/chat" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-cyan-300">Open AI Chat <ArrowIcon/></Link></div><div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8">{[["AIWoven Assistant","Direct, focused answers"],["Multi-step workflow","Plan, draft, and review"],["Study intelligence","Notes, cards, and quizzes"],["Automatic routing","Reliable task handling"]].map(([name,detail])=><div key={name} className="bg-[#0b0f17] p-5"><span className="block h-2 w-2 rounded-full bg-cyan-300"/><p className="mt-8 text-sm font-medium text-white">{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>)}</div></div></div></section>

      <section className="px-4 pb-24 sm:px-6 lg:pb-32"><div className="mx-auto grid max-w-6xl gap-10 border-y border-white/10 py-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-violet-400">AI Study showcase</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white">Study the explanation, not just the score.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Upload a lecture document, then move through notes, large 3D flashcards, and a focused quiz route that explains every answer.</p><Link href="/ai-study" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-cyan-300">Open AI Study <ArrowIcon/></Link></div><div className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]"><div className="flex min-h-72 flex-col items-center justify-center rounded-[1.8rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.12),transparent_52%),#090e16] p-8 text-center"><span className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-400">Flashcard</span><p className="mt-7 max-w-sm text-2xl font-medium leading-9 text-white">How do ATP and NADPH support the Calvin cycle?</p><p className="mt-7 text-xs text-slate-500">Click or press Space to flip</p></div><div className="rounded-[1.8rem] border border-white/10 bg-white/[0.025] p-6"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">Question 3 of 8</span><span className="text-xs text-emerald-300">Correct</span></div><div className="mt-4 h-1 rounded-full bg-white/8"><div className="h-full w-[38%] rounded-full bg-violet-400"/></div><p className="mt-8 text-sm font-medium text-white">Why is this correct?</p><p className="mt-3 text-xs leading-6 text-slate-400">ATP supplies energy while NADPH provides reducing power for carbon fixation and carbohydrate synthesis.</p></div></div></div></section>

      <section id="impact" className="scroll-mt-28 border-y border-white/8 bg-white/[0.018] px-4 py-20 sm:px-6"><div className="mx-auto max-w-6xl"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-emerald-400">Verified student impact</p><div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-5"><Stat value={stats.studentsHelped} label="Students helped"/><Stat value={stats.studySessionsCompleted} label="Study activities"/><Stat value={stats.notesGenerated} label="Notes generated"/><Stat value={stats.flashcardSetsCreated} label="Flashcard sets"/><Stat value={stats.aiToolsAvailable} label="AI tools available"/></div><p className="mt-8 text-xs text-slate-600">Counts come from successful registered-user tool events and saved study sessions. Anonymous visits are excluded.</p></div></section>

      <section id="faq" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:py-32"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.65fr_1.35fr]"><div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-400">FAQ</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white">Before you weave it into your study routine.</h2></div><div className="divide-y divide-white/10 border-t border-white/10">{faqs.map(([question,answer])=><details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm font-medium text-white focus-visible:outline-none"><span>{question}</span><span className="text-xl font-light text-slate-500 transition group-open:rotate-45" aria-hidden>+</span></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-slate-400">{answer}</p></details>)}</div></div></section>

      <section className="px-4 pb-16 sm:px-6"><div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.3rem] border border-white/10 bg-[#090d15] px-6 py-16 text-center sm:px-12 sm:py-24"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(34,211,238,.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,.14),transparent_35%)]" aria-hidden/><AIWovenMark className="relative mx-auto h-12 w-16" title="AIWoven"/><h2 className="relative mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-[-.055em] text-white sm:text-6xl">Turn your next lecture into something you’ll actually remember.</h2><Link href="/chat" className="relative mt-8 inline-flex items-center gap-3 rounded-full bg-cyan-300 px-7 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Try for free <ArrowIcon/></Link></div></section>

      <footer className="border-t border-white/8 px-4 py-8 sm:px-6"><div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><AIWovenLogo/><p className="text-xs text-slate-600">Every study tool, woven into one AI workspace.</p><div className="flex gap-5 text-xs text-slate-500"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/blog" className="hover:text-white">Blog</Link><Link href="/chat" className="hover:text-white">{session ? "Workspace" : "Log in"}</Link></div></div></footer>
    </main>
  );
}
