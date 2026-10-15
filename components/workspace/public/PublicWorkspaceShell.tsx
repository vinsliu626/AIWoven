"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn, signOut, useSession, type ClientSafeProvider } from "next-auth/react";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";
import { HeaderAuthMenu, WorkspaceBreadcrumb, workspaceModeTitle } from "@/components/app/WorkspaceHeader";

import { useAppLanguage } from "@/components/app/AppLanguageProvider";
import { ProTrialWheelModal, ProTrialWheelReminderPrompt } from "@/components/billing/ProTrialWheelModal";
import { PlanModal } from "@/components/chat/billing/PlanModal";
import { PlanPillButton } from "@/components/chat/billing/PlanPill";
import { RedeemModal } from "@/components/chat/billing/RedeemModal";
import type { Entitlement } from "@/components/chat/billing/types";
import { SettingsModal } from "@/components/chat/settings/SettingsModal";
import type { ChatMode } from "@/components/chat/ui/workflow/types";
import { useProTrialWheel } from "@/lib/hooks/useProTrialWheel";

type RenderContext = {
  entitlement: Entitlement | null;
  locked: boolean;
  isZh: boolean;
  authLoading: boolean;
  authProviders: ClientSafeProvider[];
  refreshEntitlement: () => Promise<void>;
};

type RedeemSuccessState = {
  plan: string;
  grantEndAt: string | null;
};

async function safeReadJson(res: Response) {
  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { text, data };
}

export function CompactRouteIntro({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <div className="sr-only">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{intro}</p>
    </div>
  );
}

export function PublicWorkspaceShell({
  mode,
  title,
  children,
}: {
  mode: ChatMode;
  title?: string;
  children: (context: RenderContext) => ReactNode;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lang, setLang, isZh, clearLang } = useAppLanguage();

  const [planOpen, setPlanOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCodeValue, setRedeemCodeValue] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<RedeemSuccessState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceNavCollapsed, setWorkspaceNavCollapsed] = useState(false);
  const [workspaceNavTransitionReady, setWorkspaceNavTransitionReady] = useState(false);
  const [authProviders, setAuthProviders] = useState<Record<string, ClientSafeProvider>>({});
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  const sessionExists = !!session;
  const authLoading = status === "loading";

  useEffect(() => {
    try {
      setWorkspaceNavCollapsed(localStorage.getItem("aiwoven:chat-sidebar-collapsed") === "true");
    } catch {}
    setWorkspaceNavTransitionReady(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleWorkspaceNav = () => setWorkspaceNavCollapsed((current) => {
    const next = !current;
    try { localStorage.setItem("aiwoven:chat-sidebar-collapsed", String(next)); } catch {}
    return next;
  });

  const refreshEntitlement = useCallback(async () => {
    if (!sessionExists) {
      setEntitlement(null);
      return;
    }
    const res = await fetch("/api/billing/status", { cache: "no-store", credentials: "include" });
    const { data } = await safeReadJson(res);
    if (res.ok && data && typeof data === "object" && "ok" in data) {
      setEntitlement(data as Entitlement);
    }
  }, [sessionExists]);

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  useEffect(() => {
    if (sessionExists) return;
    let cancelled = false;

    void getProviders()
      .then((providers) => {
        if (!cancelled) setAuthProviders(providers ?? {});
      })
      .catch(() => {
        if (!cancelled) setAuthProviders({});
      });

    return () => {
      cancelled = true;
    };
  }, [sessionExists]);

  const visibleAuthProviders = ["google", "github", "e2e-credentials"]
    .map((id) => authProviders[id])
    .filter((provider): provider is ClientSafeProvider => Boolean(provider));
  const userInitial = session?.user?.name?.[0] || session?.user?.email?.[0] || "U";
  const userLabel = session?.user?.name || session?.user?.email || "User";
  const userEmail = session?.user?.email || "";
  const trialWheel = useProTrialWheel({
    sessionExists,
    userId: session?.user?.id ?? session?.user?.email ?? null,
  });

  function openRedeemModal(prefillCode = "") {
    setRedeemError(null);
    setRedeemCodeValue(prefillCode);
    setRedeemOpen(true);
  }

  async function redeemCode(code: string) {
    setRedeemError(null);
    if (!code) return;
    setRedeemLoading(true);
    try {
      const res = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ code }),
      });
      const { data } = await safeReadJson(res);
      if (!res.ok || !data || typeof data !== "object" || ("ok" in data && data.ok === false)) {
        throw new Error(
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : `Redeem error: ${res.status}`
        );
      }
      setRedeemSuccess({
        plan: typeof (data as { plan?: unknown }).plan === "string" ? (data as { plan: string }).plan : "pro",
        grantEndAt:
          typeof (data as { grantEndAt?: unknown }).grantEndAt === "string" ? (data as { grantEndAt: string }).grantEndAt : null,
      });
      setRedeemCodeValue("");
      await refreshEntitlement();
      setTimeout(() => {
        setRedeemOpen(false);
        setRedeemSuccess(null);
      }, 1400);
    } catch (error) {
      setRedeemError(error instanceof Error ? error.message : "Unable to redeem code.");
    } finally {
      setRedeemLoading(false);
    }
  }

  async function manageBilling(plan: "pro" | "ultra") {
    const billingRoute = entitlement?.plan === plan ? "/api/billing/portal" : "/api/billing/checkout";
    const res = await fetch(billingRoute, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      ...(billingRoute === "/api/billing/checkout" ? { body: JSON.stringify({ plan }) } : {}),
    });
    const { text, data } = await safeReadJson(res);
    if (!res.ok) {
      alert(`Checkout API failed (${res.status})\n` + (text || JSON.stringify(data || {})));
      return;
    }
    const url = data && typeof data === "object" && "url" in data && typeof data.url === "string" ? data.url : null;
    if (url) {
      window.location.href = url;
    }
  }

  function clearLocalData() {
    clearLang();
    try {
      window.localStorage.removeItem("theme");
    } catch {}
  }

  return (
    <main className="aiwoven-workspace relative min-h-screen w-full overflow-x-clip bg-[var(--app-canvas)] font-sans text-slate-800">
      <div className="relative z-10 flex min-h-screen">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:flex">
          <AIWovenAppNav
            isOwner={session?.user?.role === "OWNER"}
            collapsible
            collapsed={workspaceNavCollapsed}
            transitionReady={workspaceNavTransitionReady}
            onToggleCollapsed={toggleWorkspaceNav}
            onBilling={() => { void refreshEntitlement(); setPlanOpen(true); }}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Open workspace navigation">
              <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
            <WorkspaceBreadcrumb title={title ?? workspaceModeTitle(mode, isZh)} isZh={isZh} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {sessionExists ? <><div className="hidden md:block">
              {entitlement?.isOwner ? <span className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-[13px] font-semibold text-blue-700">Owner · Unlimited</span> : <PlanPillButton
                isZh={isZh}
                plan={entitlement?.plan ?? "basic"}
                unlimited={!!entitlement?.unlimited}
                onClick={() => {
                  void refreshEntitlement();
                  setPlanOpen(true);
                }}
              />}
            </div>
            <span className="hidden h-6 w-px bg-slate-200 md:block" aria-hidden /></> : null}
            <HeaderAuthMenu
              isZh={isZh}
              sessionExists={sessionExists}
              userInitial={String(userInitial)}
              userLabel={userLabel}
              userEmail={userEmail}
              visibleAuthProviders={visibleAuthProviders}
              onOpenAccount={() => router.push("/account")}
              onOpenBilling={() => {
                void refreshEntitlement();
                setPlanOpen(true);
              }}
              onOpenSettings={() => setSettingsOpen(true)}
              isOwner={session?.user?.role === "OWNER"}
              onSignOut={() => void signOut()}
            />
          </div>
        </header>

        {redeemSuccess ? (
          <div className="px-4 pt-4 md:px-8">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">
                {isZh ? "礼包已激活。" : "Gift activated."}{" "}
                <span className="text-slate-600">
                  {redeemSuccess.plan}
                  {redeemSuccess.grantEndAt ? ` · ${redeemSuccess.grantEndAt}` : ""}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="app-workspace-content relative z-10 flex-1 pb-6">
          {children({ entitlement, locked: !sessionExists, isZh, authLoading, authProviders: visibleAuthProviders, refreshEntitlement })}
        </div>
        </div>
      </div>

      {mobileNavOpen ? <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" aria-label="Close workspace navigation" onClick={() => setMobileNavOpen(false)} /><div className="absolute inset-y-0 left-0 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)]"><AIWovenAppNav mobile isOwner={session?.user?.role === "OWNER"} onClose={() => setMobileNavOpen(false)} onBilling={() => { void refreshEntitlement(); setPlanOpen(true); }} onSettings={() => setSettingsOpen(true)} /></div></div> : null}

      <PlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        isZh={isZh}
        sessionExists={sessionExists}
        ent={entitlement}
        onOpenRedeem={() => {
          if (!sessionExists) return void signIn();
          openRedeemModal();
        }}
        onManageBilling={manageBilling}
        refreshEnt={refreshEntitlement}
      />

      <ProTrialWheelReminderPrompt
        open={trialWheel.reminderOpen}
        dontRemindAgain={trialWheel.reminderDismissed}
        onDontRemindAgainChange={trialWheel.setReminderDismissed}
        onSpinNow={trialWheel.openWheelFromReminder}
        onMaybeLater={() => trialWheel.closeReminder({ dontRemindAgain: trialWheel.reminderDismissed })}
      />

      <ProTrialWheelModal
        open={trialWheel.open}
        onClose={trialWheel.closeWheel}
        onUseCode={(code) => {
          openRedeemModal(code);
          trialWheel.clearSpinResult();
          trialWheel.closeWheel();
        }}
        status={trialWheel.status}
        spinResult={trialWheel.spinResult}
        spinSequence={trialWheel.spinSequence}
        spinning={trialWheel.spinning}
        error={trialWheel.error}
        onSpin={trialWheel.spinWheel}
      />

      <RedeemModal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        isZh={isZh}
        code={redeemCodeValue}
        onCodeChange={setRedeemCodeValue}
        onRedeem={redeemCode}
        onOpenTrialWheel={() => void trialWheel.openWheel()}
        loading={redeemLoading}
        error={redeemError}
        success={redeemSuccess}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isZh={isZh}
        lang={lang}
        setLang={setLang}
        sessionExists={sessionExists}
        accountLabel={session?.user?.email ?? session?.user?.name ?? null}
        ent={entitlement}
        mode={mode}
        onOpenPlan={() => {
          void refreshEntitlement();
          setPlanOpen(true);
        }}
        onOpenRedeem={() => {
          if (!sessionExists) return void signIn();
          openRedeemModal();
        }}
        onSignOut={sessionExists ? () => void signOut() : undefined}
        onClearLocalData={clearLocalData}
      />

    </main>
  );
}
