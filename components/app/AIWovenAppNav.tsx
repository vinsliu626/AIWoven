"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AIWovenLogo, AIWovenMark } from "@/components/brand/AIWovenLogo";

type IconName = "chat" | "note" | "detect" | "study" | "humanizer" | "converter" | "history" | "flashcards" | "quiz" | "account" | "billing" | "settings" | "analytics";
type SessionItem = { id: string; title: string; pinned?: boolean };

const aiItems: Array<{ label: string; href: string; icon: IconName }> = [
  { label: "Note", href: "/ai-note", icon: "note" },
  { label: "Detect", href: "/ai-detector", icon: "detect" },
  { label: "Study", href: "/ai-study", icon: "study" },
  { label: "Humanizer", href: "/ai-humanizer", icon: "humanizer" },
  { label: "Converter", href: "/converter", icon: "converter" },
];

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    chat: <><path d="M5 6.5h14v9H9l-4 3v-12Z"/><path d="M8 10h8M8 13h5"/></>,
    note: <><path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M14.5 3.5v4h4M9.5 11h5M9.5 14h5M9.5 17h3"/></>,
    detect: <><circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4M11 8v6M8 11h6"/></>,
    study: <><path d="m3.5 6 8.5-3 8.5 3-8.5 3z"/><path d="M6 8.2v5.3c2.7 2 9.3 2 12 0V8.2M20.5 6v6"/></>,
    humanizer: <><path d="M12 3.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9Z"/><path d="M9.5 18h5M10.5 21h3M3 10h2M19 10h2M5.5 4.5 7 6M18.5 4.5 17 6"/></>,
    converter: <><path d="M5 7h13l-3-3M19 17H6l3 3"/><path d="m18 7-3 3M6 17l3-3"/></>,
    history: <><path d="M4.5 8V4m0 0h4M4.7 4.3A8.5 8.5 0 1 1 3.8 15"/><path d="M12 7.5V12l3 2"/></>,
    flashcards: <><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M3 7v10M9 8h6M9 12h6M9 16h4"/></>,
    quiz: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3 2.3c-.7.3-.7.9-.7 1.7M12 17h.01"/></>,
    account: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6"/></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5c.1-.3.1-.7.1-1Z"/></>,
    analytics: <><path d="M5 20V10M12 20V4M19 20v-7M3 20h18"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

type TooltipPosition = { top: number; left: number } | null;

function Tooltip({ id, label, position }: { id: string; label: string; position: TooltipPosition }) {
  if (!position || typeof document === "undefined") return null;
  return createPortal(<span id={id} role="tooltip" style={position} className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#111722] px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-[0_10px_28px_rgba(0,0,0,.35)]">{label}</span>, document.body);
}

function NavLink({ label, href, icon, active, collapsed, onClick }: { label: string; href: string; icon: IconName; active: boolean; collapsed: boolean; onClick?: () => void }) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>(null);
  const showTooltip = () => {
    if (!collapsed) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setTooltipPosition({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  return <Link ref={anchorRef} href={href} onClick={onClick} onMouseEnter={showTooltip} onMouseLeave={() => setTooltipPosition(null)} onFocus={showTooltip} onBlur={() => setTooltipPosition(null)} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} aria-describedby={collapsed ? tooltipId : undefined} className={`group relative flex min-h-10 items-center rounded-xl text-[13px] transition-colors focus-visible:z-20 ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-cyan-300/[0.09] text-cyan-50" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
    <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-colors ${active ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" : "border-white/8 bg-white/[0.025] text-slate-500 group-hover:text-slate-300"}`}><Icon name={icon}/></span>
    <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{label}</span>
    {collapsed ? <Tooltip id={tooltipId} label={label} position={tooltipPosition}/> : null}
  </Link>;
}

function NavButton({ label, icon, collapsed, onClick }: { label: string; icon: IconName; collapsed: boolean; onClick: () => void }) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>(null);
  const showTooltip = () => {
    if (!collapsed) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setTooltipPosition({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  return <button ref={anchorRef} type="button" onClick={onClick} onMouseEnter={showTooltip} onMouseLeave={() => setTooltipPosition(null)} onFocus={showTooltip} onBlur={() => setTooltipPosition(null)} aria-label={collapsed ? label : undefined} aria-describedby={collapsed ? tooltipId : undefined} className={`group relative flex min-h-10 w-full items-center rounded-xl text-left text-[13px] text-slate-400 hover:bg-white/[0.045] hover:text-slate-100 ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}>
    <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[0.025] text-slate-500 group-hover:text-slate-300"><Icon name={icon}/></span>
    <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{label}</span>
    {collapsed ? <Tooltip id={tooltipId} label={label} position={tooltipPosition}/> : null}
  </button>;
}

export function AIWovenAppNav({ mobile = false, isOwner = false, collapsed = false, collapsible = false, transitionReady = true, onToggleCollapsed, onClose, onBilling, onSettings }: { mobile?: boolean; isOwner?: boolean; collapsed?: boolean; collapsible?: boolean; transitionReady?: boolean; onToggleCollapsed?: () => void; onClose?: () => void; onBilling?: () => void; onSettings?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compact = collapsible && collapsed && !mobile;
  const activeSessionId = searchParams.get("session");
  const historyActive = pathname === "/chat" && searchParams.get("history") === "1";
  const [chatOpen, setChatOpen] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setChatOpen(localStorage.getItem("aiwoven:nav-chat-open") !== "false"); } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/sessions", { cache: "no-store", credentials: "include" })
      .then((response) => response.ok ? response.json() : { sessions: [] })
      .then((data) => { if (!cancelled) setSessions(Array.isArray(data.sessions) ? data.sessions.slice(0, 8) : []); })
      .catch(() => { if (!cancelled) setSessions([]); });
    return () => { cancelled = true; };
  }, [pathname, activeSessionId]);

  const setChatDisclosure = () => setChatOpen((current) => {
    const next = !current;
    try { localStorage.setItem("aiwoven:nav-chat-open", String(next)); } catch {}
    return next;
  });
  const openAccountSection = (section: "billing" | "settings") => {
    if (section === "billing" && onBilling) onBilling(); else if (section === "settings" && onSettings) onSettings(); else window.location.href = `/account#${section}`;
    onClose?.();
  };
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const sectionLabel = (label: string) => <div className={`mt-5 font-mono text-[9px] uppercase tracking-[.22em] text-slate-600 ${compact ? "sr-only" : "px-3"}`}>{label}</div>;

  return <aside data-testid={mobile ? "mobile-workspace-nav" : "desktop-workspace-nav"} data-collapsed={compact ? "true" : "false"} className={`${mobile ? "flex h-full w-[248px]" : `chat-workspace-nav hidden lg:flex ${collapsible ? (compact ? "w-[80px]" : "w-[236px]") : "w-[236px]"}`} shrink-0 flex-col overflow-x-hidden border-r border-white/[0.07] bg-[#080a0f]/96 px-3 py-4 ${transitionReady ? "transition-[width] duration-200 ease-out motion-reduce:transition-none" : "transition-none"}`} aria-label="Workspace navigation">
    <div className={`flex items-center ${compact ? "h-20 flex-col justify-start gap-2" : "h-11 gap-2"}`}>
      <Link href="/" onClick={onClose} aria-label="AIWoven home" className={compact ? "flex-none" : "min-w-0 flex-1 px-1"}>{compact ? <AIWovenMark className="chat-nav-brand-compact h-7 w-8" title="AIWoven"/> : <AIWovenLogo className="chat-nav-brand-full h-7"/>}</Link>
      {collapsible && !mobile ? <button type="button" data-testid="workspace-nav-toggle" onClick={onToggleCollapsed} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} title={compact ? "Expand sidebar" : "Collapse sidebar"} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/20 hover:bg-cyan-300/[0.07] hover:text-cyan-200"><svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4"><path d={compact ? "M9 5l7 7-7 7" : "M15 5 8 12l7 7"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></button> : null}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {sectionLabel("AI Workspace")}
      <nav className="mt-2 space-y-1" aria-label="AI workspace tools">
        <div className="relative flex items-center">
          <div className="min-w-0 flex-1"><NavLink label="Chat" href="/chat" icon="chat" collapsed={compact} active={pathname === "/chat" && !historyActive} onClick={onClose}/></div>
          {!compact ? <button type="button" onClick={setChatDisclosure} aria-label={chatOpen ? "Collapse Chat history" : "Expand Chat history"} aria-expanded={chatOpen} className="absolute right-1.5 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"><svg viewBox="0 0 20 20" aria-hidden className={`h-3.5 w-3.5 transition-transform ${chatOpen ? "rotate-90" : ""}`}><path d="m7 4 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></button> : null}
        </div>
        {!compact && chatOpen ? <div data-testid="nav-chat-history" className="ml-7 max-h-48 space-y-0.5 overflow-y-auto border-l border-white/[0.07] pl-2 custom-scrollbar">
          {sessions.length ? sessions.map((session) => <Link key={session.id} href={`/chat?session=${encodeURIComponent(session.id)}`} onClick={onClose} aria-current={activeSessionId === session.id ? "page" : undefined} className={`block truncate rounded-lg px-2.5 py-1.5 text-[11px] ${activeSessionId === session.id ? "bg-cyan-300/[0.08] text-cyan-100" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"}`} title={session.title}>{session.pinned ? "• " : ""}{session.title}</Link>) : <p className="px-2.5 py-1.5 text-[10px] text-slate-600">No recent conversations</p>}
        </div> : null}
        {aiItems.map((item) => <NavLink key={item.href} {...item} collapsed={compact} active={isActive(item.href)} onClick={onClose}/>)}
        <NavLink label="History" href="/chat?history=1" icon="history" collapsed={compact} active={historyActive} onClick={onClose}/>
      </nav>

      <div className="mx-3 mt-5 border-t border-white/[0.08]"/>
      {sectionLabel("Study Tools")}
      <nav className="mt-2 space-y-1" aria-label="Study tools">
        <NavLink label="Flashcards" href="/flashcards" icon="flashcards" collapsed={compact} active={isActive("/flashcards")} onClick={onClose}/>
        <NavLink label="Quiz Me" href="/quiz-me" icon="quiz" collapsed={compact} active={isActive("/quiz-me")} onClick={onClose}/>
      </nav>
    </div>

    <div className="mt-3 border-t border-white/[0.07] pt-3">
      {isOwner ? <NavLink label="Owner Analytics" href="/owner/analytics" icon="analytics" collapsed={compact} active={isActive("/owner/analytics")} onClick={onClose}/> : null}
      <NavLink label="Account" href="/account" icon="account" collapsed={compact} active={pathname === "/account"} onClick={onClose}/>
      <NavButton label="Billing" icon="billing" collapsed={compact} onClick={() => openAccountSection("billing")}/>
      <NavButton label="Settings" icon="settings" collapsed={compact} onClick={() => openAccountSection("settings")}/>
    </div>
  </aside>;
}
