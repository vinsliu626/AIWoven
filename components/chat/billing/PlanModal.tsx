"use client";

import { signIn } from "next-auth/react";
import { PRODUCT_PLAN_LIMITS, type PlanId as ProductPlanId } from "@/lib/plans/productLimits";
import { Entitlement, PlanId } from "./types";
import { formatLimitSeconds, formatSecondsToHrs, planLabel } from "./planUtils";

export type EntitlementLike = Entitlement;

type FeatureRow = {
  label: string;
  value: string;
};

type UsageRow = {
  label: string;
  used: string;
  limit: string;
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return "Unlimited";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMb(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

function formatPrice(oldPrice: string | null, newPrice: string, priceSuffix: string) {
  return { oldPrice, newPrice, priceSuffix };
}

function buildPlanFeatures(plan: ProductPlanId, isZh: boolean): FeatureRow[] {
  const limits = PRODUCT_PLAN_LIMITS[plan];

  return [
    {
      label: isZh ? "AI \u68c0\u6d4b\u5668" : "AI Detector",
      value: limits.detectorWordsPerWeek == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatNumber(limits.detectorWordsPerWeek)} ${isZh ? "\u8bcd / \u5468" : "words/week"}`,
    },
    {
      label: isZh ? "AI \u7b14\u8bb0" : "AI Notes",
      value: `${limits.noteSecondsPerWeek == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatLimitSeconds(limits.noteSecondsPerWeek)} ${isZh ? "/ \u5468" : "/ week"}`} | ${formatNumber(limits.note.generatesPerDay)}${isZh ? "/ \u5929" : "/day"}`,
    },
    {
      label: isZh ? "\u804a\u5929" : "Chat",
      value: `${formatNumber(limits.chat.messagesPerDay)}${isZh ? "/ \u5929" : "/day"} | ${formatNumber(limits.chat.maxInputChars)} ${isZh ? "\u5b57\u7b26 / \u6b21" : "chars/input"}`,
    },
    {
      label: isZh ? "AI Humanizer" : "AI Humanizer",
      value: `${formatNumber(limits.humanizer.wordsPerWeek)} ${isZh ? "\u8bcd / \u5468" : "words/week"} | ${formatNumber(limits.humanizer.maxInputWords)} ${isZh ? "\u8bcd / \u6b21" : "words/request"}`,
    },
    {
      label: isZh ? "AI \u5b66\u4e60" : "AI Study",
      value: `${formatNumber(limits.study.generationsPerDay)}${isZh ? "/ \u5929" : "/day"} | ${formatMb(limits.study.maxFileSizeBytes)} ${isZh ? "\u6587\u4ef6" : "files"}`,
    },
    {
      label: isZh ? "\u8f6c\u6362\u5668" : "Converter",
      value: `${formatNumber(limits.converter.conversionsPerDay)}${isZh ? "/ \u5929" : "/day"} | ${formatMb(limits.converter.maxFileSizeBytes)} ${isZh ? "\u4e0a\u9650" : "max file"} | ${
        limits.converter.allowAdvancedVideo ? (isZh ? "\u5b8c\u6574\u5a92\u4f53\u683c\u5f0f" : "full media formats") : isZh ? "\u57fa\u7840\u89c6\u9891 / \u97f3\u9891" : "basic video / audio"
      }`,
    },
    {
      label: isZh ? "\u9ad8\u4eae" : "Highlights",
      value: limits.canSeeSuspiciousSentences ? (isZh ? "\u5305\u542b\u53ef\u7591\u53e5\u9ad8\u4eae" : "Suspicious sentences included") : (isZh ? "\u53ef\u7591\u53e5\u9ad8\u4eae\u53d7\u9650" : "Suspicious sentences locked"),
    },
  ];
}

function buildUsageRows(ent: EntitlementLike, isZh: boolean): UsageRow[] {
  return [
    {
      label: isZh ? "AI \u68c0\u6d4b\u5668" : "AI Detector",
      used: formatNumber(ent.usedDetectorWordsThisWeek),
      limit: ent.detectorWordsPerWeek == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatNumber(ent.detectorWordsPerWeek)} ${isZh ? "\u8bcd / \u5468" : "words/week"}`,
    },
    {
      label: isZh ? "AI \u7b14\u8bb0" : "AI Notes",
      used: formatSecondsToHrs(ent.usedNoteSecondsThisWeek),
      limit: ent.noteSecondsPerWeek == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatLimitSeconds(ent.noteSecondsPerWeek)} ${isZh ? "/ \u5468" : "/ week"}`,
    },
    {
      label: isZh ? "\u7b14\u8bb0\u751f\u6210" : "Notes Generations",
      used: formatNumber(ent.usedNoteGeneratesToday ?? 0),
      limit: ent.noteGeneratesPerDay == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatNumber(ent.noteGeneratesPerDay)}${isZh ? "/ \u5929" : "/day"}`,
    },
    {
      label: isZh ? "\u804a\u5929" : "Chat",
      used: formatNumber(ent.usedChatCountToday),
      limit: ent.chatPerDay == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatNumber(ent.chatPerDay)}${isZh ? "/ \u5929" : "/day"}`,
    },
    {
      label: isZh ? "AI Humanizer" : "AI Humanizer",
      used: formatNumber(ent.usedHumanizerWordsThisWeek ?? 0),
      limit:
        ent.humanizerWordsPerWeek == null
          ? isZh ? "\u4e0d\u53ef\u7528" : "Unavailable"
          : `${formatNumber(ent.humanizerWordsPerWeek)} ${isZh ? "\u8bcd / \u5468" : "words/week"} | ${formatNumber(ent.humanizerMaxInputWords ?? 0)} ${isZh ? "\u8bcd / \u6b21" : "words/request"}`,
    },
    {
      label: isZh ? "AI \u5b66\u4e60" : "AI Study",
      used: formatNumber(ent.usedStudyCountToday ?? 0),
      limit: ent.studyGenerationsPerDay == null ? (isZh ? "\u4e0d\u9650\u91cf" : "Unlimited") : `${formatNumber(ent.studyGenerationsPerDay)}${isZh ? "/ \u5929" : "/day"}`,
    },
    {
      label: isZh ? "\u8f6c\u6362\u5668" : "Converter",
      used: formatNumber(ent.usedConverterCountToday ?? 0),
      limit:
        ent.converterConversionsPerDay == null
          ? isZh ? "\u4e0d\u53ef\u7528" : "Unavailable"
          : `${formatNumber(ent.converterConversionsPerDay)}${isZh ? "/ \u5929" : "/day"} | ${formatMb(ent.converterMaxFileSizeBytes ?? 0)} ${isZh ? "\u4e0a\u9650" : "max file"}`,
    },
    {
      label: isZh ? "\u804a\u5929\u9884\u7b97" : "Chat Budget",
      used: formatNumber(ent.usedChatInputCharsWindow ?? 0),
      limit:
        ent.chatBudgetCharsPerWindow == null
          ? isZh ? "\u4e0d\u9650\u91cf" : "Unlimited"
          : `${formatNumber(ent.chatBudgetCharsPerWindow)} ${isZh ? "\u5b57\u7b26 /" : "chars /"} ${ent.chatBudgetWindowHours ?? 3}h`,
    },
  ];
}

function UsageStat({ row }: { row: UsageRow }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 ">
      <p className="text-[10px] uppercase tracking-[.06em] text-slate-500">{row.label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{row.used}</p>
      <p className="mt-1 text-[11px] text-slate-500">{row.limit}</p>
    </div>
  );
}

function Card({
  title,
  plan,
  badge,
  active,
  features,
  cta,
  onClick,
  oldPrice,
  price,
  priceSuffix,
}: {
  title: string;
  plan: ProductPlanId;
  badge?: string;
  active?: boolean;
  features: FeatureRow[];
  cta: string;
  onClick: () => void;
  oldPrice?: string | null;
  price: string;
  priceSuffix: string;
}) {
  const isPro = plan === "pro";
  const ctaClass = active
    ? "cursor-default border border-slate-200 bg-slate-50 text-slate-500"
    : isPro
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100";

  return (
    <article className={["relative flex h-full flex-col rounded-2xl border p-5 transition-colors md:p-6", isPro ? "border-blue-400 bg-blue-50" : active ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"].join(" ")}>
      <div className="flex min-h-7 flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {badge ? <span className={["rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.06em]", isPro ? "bg-blue-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-500"].join(" ")}>{badge}</span> : null}
        {active ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] uppercase tracking-[.06em] text-slate-600">Current</span> : null}
      </div>

      <div className="mt-6 flex min-h-[54px] items-end gap-2 border-b border-slate-200 pb-5">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">{price}</span>
        {priceSuffix ? <span className="pb-1 text-xs text-slate-500">{priceSuffix}</span> : null}
        {oldPrice ? <span className="mb-1 ml-auto text-[11px] text-slate-400 line-through">{oldPrice}</span> : null}
      </div>

      <ul className="mt-5 flex-1 space-y-4">
        {features.map((feature) => (
          <li key={feature.label} className="grid grid-cols-[24px_1fr] gap-3">
            <span aria-hidden className={["mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold", isPro ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"].join(" ")}>✓</span>
            <div>
              <p className="text-[10px] uppercase tracking-[.06em] text-slate-500">{feature.label}</p>
              <p className="mt-1 text-[12px] leading-5 text-slate-800">{feature.value}</p>
            </div>
          </li>
        ))}
      </ul>

      <button onClick={onClick} disabled={active} className={["mt-6 h-11 w-full rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40", ctaClass].join(" ")}>
        {cta}
      </button>
    </article>
  );
}

export function PlanModal({
  open,
  onClose,
  isZh,
  sessionExists,
  ent,
  onOpenRedeem,
  onManageBilling,
  refreshEnt,
}: {
  open: boolean;
  onClose: () => void;
  isZh: boolean;
  sessionExists: boolean;
  ent: EntitlementLike | null;
  onOpenRedeem: () => void;
  onManageBilling: (plan: "pro" | "ultra") => void;
  refreshEnt: () => Promise<void> | void;
}) {
  if (!open) return null;

  const cur = ent?.plan ?? "basic";
  const usageRows = ent ? buildUsageRows(ent, isZh) : [];
  const proPrice = formatPrice("$6.99", "$5.99", "/ mo");
  const ultraPrice = formatPrice("$11.99", "$7.99", "/ mo");
  const copy = {
    title: isZh ? "\u9009\u62e9\u9002\u5408\u4f60\u7684\u5957\u9910" : "Choose the plan that fits",
    subtitle: isZh
      ? "\u5347\u7ea7\u524d\u5148\u67e5\u770b\u804a\u5929\u3001\u68c0\u6d4b\u3001\u7b14\u8bb0\u3001Humanizer\u3001\u5b66\u4e60\u548c\u8f6c\u6362\u5668\u7684\u771f\u5b9e\u989d\u5ea6\u3002"
      : "Compare every included AIWoven tool and its real usage limit at a glance.",
    close: isZh ? "\u5173\u95ed" : "Close",
    currentPlan: isZh ? "\u5f53\u524d\u5957\u9910" : "Current Plan",
    unlimited: isZh ? "\u4e0d\u9650\u91cf" : "Unlimited",
    refresh: isZh ? "\u5237\u65b0" : "Refresh",
    redeem: isZh ? "\u5151\u6362\u793c\u5305\u7801" : "Redeem code",
    notSignedIn: isZh ? "\u514d\u8d39\u5957\u9910\u65e0\u9700\u4ed8\u8d39\u3002\u767b\u5f55\u540e\u5373\u53ef\u4f7f\u7528\u5e76\u4fdd\u5b58\u8bb0\u5f55\u3002" : "The free plan requires no payment. Sign in to start using it and save your work.",
    current: isZh ? "\u5f53\u524d" : "Current",
    switchBasic: isZh ? "\u5207\u6362\u5230 Basic" : "Switch to Basic",
    manage: isZh ? "\u7ba1\u7406" : "Manage",
    upgradePro: isZh ? "\u5347\u7ea7\u5230 Pro" : "Upgrade to Pro",
    upgradeUltra: isZh ? "\u5347\u7ea7\u5230 Ultra" : "Upgrade to Ultra",
    signInFree: isZh ? "\u767b\u5f55\u540e\u514d\u8d39\u4f7f\u7528" : "Sign in to start free",
    signInToUpgrade: isZh ? "\u767b\u5f55\u540e\u5347\u7ea7" : "Sign in to upgrade",
    starter: isZh ? "\u5165\u95e8" : "Starter",
    popular: isZh ? "\u70ed\u95e8" : "Popular",
    ultimate: isZh ? "\u65d7\u8230" : "Ultimate",
    liveUsage: isZh
      ? "\u4e0b\u65b9\u5c55\u793a\u7684\u662f\u5171\u4eab\u4ea7\u54c1\u9650\u5236\u914d\u7f6e\u548c\u5f53\u524d\u5b9e\u65f6\u7528\u91cf\u3002"
      : "Plan card limits are sourced from the shared product limits config, and current usage comes from the live billing status endpoint.",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="plan-modal-title" className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="plan-modal-title" className="text-base font-semibold text-slate-900">{copy.title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">{copy.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={copy.close}
          >
            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="custom-scrollbar max-h-[82vh] overflow-y-auto px-4 py-5 sm:px-6">
          {sessionExists && ent ? (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-[.06em] text-slate-600">
                      {copy.currentPlan}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-900">
                      {planLabel(ent.plan as PlanId, isZh)}
                    </span>
                    {ent.unlimited ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                        {copy.unlimited}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-[12px] leading-6 text-slate-500">
                    {ent.studyMaxFileSizeBytes != null
                      ? `Study files up to ${formatMb(ent.studyMaxFileSizeBytes)}. Quiz generation uses a fixed standard exam-review level.`
                      : "Real-time usage shown below is pulled from your current billing status."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      await refreshEnt();
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {copy.refresh}
                  </button>
                  <button
                    onClick={onOpenRedeem}
                    className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {copy.redeem}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {usageRows.map((row) => (
                  <UsageStat key={row.label} row={row} />
                ))}
              </div>
            </div>
          ) : null}

          {!sessionExists ? (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px]">✓</span>
              {copy.notSignedIn}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card
              title={isZh ? "Basic\uff08\u514d\u8d39\uff09" : "Basic (Free)"}
              plan="basic"
              price="Free"
              priceSuffix=""
              badge={copy.starter}
              active={sessionExists && cur === "basic"}
              features={buildPlanFeatures("basic", isZh)}
              cta={!sessionExists ? copy.signInFree : cur === "basic" ? copy.current : copy.switchBasic}
              onClick={async () => {
                if (!sessionExists) return signIn();
                await refreshEnt();
                onClose();
              }}
            />

            <Card
              title="Pro"
              plan="pro"
              oldPrice={proPrice.oldPrice}
              price={proPrice.newPrice}
              priceSuffix={proPrice.priceSuffix}
              badge={copy.popular}
              active={sessionExists && cur === "pro"}
              features={buildPlanFeatures("pro", isZh)}
              cta={cur === "pro" ? copy.manage : sessionExists ? copy.upgradePro : copy.signInToUpgrade}
              onClick={() => {
                if (!sessionExists) return signIn();
                onManageBilling("pro");
              }}
            />

            <Card
              title="Ultra Pro"
              plan="ultra"
              oldPrice={ultraPrice.oldPrice}
              price={ultraPrice.newPrice}
              priceSuffix={ultraPrice.priceSuffix}
              badge={copy.ultimate}
              active={sessionExists && cur === "ultra"}
              features={buildPlanFeatures("ultra", isZh)}
              cta={cur === "ultra" ? copy.manage : sessionExists ? copy.upgradeUltra : copy.signInToUpgrade}
              onClick={() => {
                if (!sessionExists) return signIn();
                onManageBilling("ultra");
              }}
            />
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 text-center text-[11px] leading-5 text-slate-500">{copy.liveUsage}</div>
        </div>
      </div>
    </div>
  );
}
