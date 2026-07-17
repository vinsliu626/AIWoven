"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AIWovenLogo, AIWovenMark } from "@/components/brand/AIWovenLogo";

const workItems = [
  ["Chat", "/chat", "C"],
  ["Note", "/ai-note", "N"],
  ["Detect", "/ai-detector", "D"],
  ["Study", "/ai-study", "S"],
  ["Humanizer", "/ai-humanizer", "H"],
  ["Converter", "/converter", "↔"],
] as const;

type NavLinkProps = {
  label: string;
  href: string;
  glyph: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
};

function Tooltip({ id, label }: { id: string; label: string }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+.65rem)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#111722] px-2.5 py-1.5 text-xs font-medium text-slate-100 opacity-0 shadow-[0_10px_28px_rgba(0,0,0,.35)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

function NavLink({ label, href, glyph, active, collapsed, onClick }: NavLinkProps) {
  const tooltipId = useId();
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      aria-describedby={collapsed ? tooltipId : undefined}
      className={`group relative flex min-h-10 items-center rounded-xl text-[13px] transition-colors focus-visible:z-20 ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-white/[0.085] text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}
    >
      <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px] transition-colors ${active ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" : "border-white/8 bg-white/[0.025] text-slate-500 group-hover:text-slate-300"}`}>{glyph}</span>
      <span className={`chat-nav-copy whitespace-nowrap ${collapsed ? "sr-only" : ""}`}>{label}</span>
      {collapsed ? <Tooltip id={tooltipId} label={label} /> : null}
    </Link>
  );
}

function NavButton({ label, glyph, collapsed, onClick }: { label: string; glyph: string; collapsed: boolean; onClick: () => void }) {
  const tooltipId = useId();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      aria-describedby={collapsed ? tooltipId : undefined}
      className={`group relative flex min-h-10 w-full items-center rounded-xl text-left text-[13px] text-slate-400 transition-colors hover:bg-white/[0.045] hover:text-slate-100 ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
    >
      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[0.025] font-mono text-[10px] text-slate-500 transition-colors group-hover:text-slate-300">{glyph}</span>
      <span className={`chat-nav-copy whitespace-nowrap ${collapsed ? "sr-only" : ""}`}>{label}</span>
      {collapsed ? <Tooltip id={tooltipId} label={label} /> : null}
    </button>
  );
}

export function AIWovenAppNav({
  mobile = false,
  isOwner = false,
  collapsed = false,
  collapsible = false,
  transitionReady = true,
  onToggleCollapsed,
  onClose,
  onBilling,
  onSettings,
}: {
  mobile?: boolean;
  isOwner?: boolean;
  collapsed?: boolean;
  collapsible?: boolean;
  transitionReady?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
  onBilling?: () => void;
  onSettings?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compact = collapsible && collapsed && !mobile;
  const historyActive = pathname === "/chat" && searchParams.get("history") === "1";
  const openAccountSection = (section: "billing" | "settings") => {
    if (section === "billing" && onBilling) onBilling();
    else if (section === "settings" && onSettings) onSettings();
    else window.location.href = `/account#${section}`;
    onClose?.();
  };

  return (
    <aside
      data-testid={mobile ? "mobile-workspace-nav" : "desktop-workspace-nav"}
      data-collapsed={compact ? "true" : "false"}
      className={`${mobile ? "flex h-full w-[228px]" : `chat-workspace-nav hidden lg:flex ${collapsible ? (compact ? "w-[80px]" : "w-[236px]") : "w-[228px]"}`} shrink-0 flex-col overflow-visible border-r border-white/[0.07] bg-[#080a0f]/96 px-3 py-4 ${transitionReady ? "transition-[width] duration-200 ease-out motion-reduce:transition-none" : "transition-none"}`}
      aria-label="Workspace navigation"
    >
      <div className={`flex h-11 items-center ${compact ? "justify-between" : "gap-2"}`}>
        <Link href="/" onClick={onClose} aria-label="AIWoven home" className="min-w-0 flex-1 px-1">
          <AIWovenLogo className={`chat-nav-brand-full h-7 ${compact ? "hidden" : ""}`} />
          <AIWovenMark className={`chat-nav-brand-compact h-7 w-8 ${compact ? "block" : "hidden"}`} title="AIWoven" />
        </Link>
        {collapsible && !mobile ? (
          <button
            type="button"
            data-testid="workspace-nav-toggle"
            onClick={onToggleCollapsed}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-400 transition-colors hover:border-cyan-300/20 hover:bg-cyan-300/[0.07] hover:text-cyan-200"
          >
            <svg viewBox="0 0 24 24" aria-hidden className={`chat-nav-toggle-icon h-4 w-4 transition-transform motion-reduce:transition-none ${compact ? "rotate-180" : ""}`}>
              <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className={`chat-nav-copy mt-5 font-mono text-[9px] uppercase tracking-[.22em] text-slate-600 ${compact ? "sr-only" : "px-3"}`}>Workspace</div>
      <nav className="mt-2 space-y-1" aria-label="Workspace tools">
        {workItems.map(([label, href, glyph]) => (
          <NavLink
            key={href}
            label={label}
            href={href}
            glyph={glyph}
            collapsed={compact}
            active={pathname === href && (href !== "/chat" || !historyActive) || pathname.startsWith(`${href}/`)}
            onClick={onClose}
          />
        ))}
        <NavLink label="History" href="/chat?history=1" glyph="↺" collapsed={compact} active={historyActive} onClick={onClose} />
      </nav>

      <div className="mt-auto border-t border-white/[0.07] pt-3">
        {isOwner ? <NavLink label="Owner Analytics" href="/owner/analytics" glyph="A" collapsed={compact} active={pathname.startsWith("/owner/analytics")} onClick={onClose} /> : null}
        <NavLink label="Account" href="/account" glyph="U" collapsed={compact} active={pathname === "/account"} onClick={onClose} />
        <NavButton label="Billing" glyph="$" collapsed={compact} onClick={() => openAccountSection("billing")} />
        <NavButton label="Settings" glyph="⚙" collapsed={compact} onClick={() => openAccountSection("settings")} />
      </div>
    </aside>
  );
}
