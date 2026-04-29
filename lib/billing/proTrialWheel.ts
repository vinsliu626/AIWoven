import { resolveEffectiveAccess } from "@/lib/billing/access";
import { createDebugWheelPrizeCode } from "@/lib/billing/debugWheelCodeStore";
import {
  PRO_TRIAL_WHEEL_PRIZES,
  type ProTrialWheelSpinResult,
  type ProTrialWheelStatus,
} from "@/lib/billing/proTrialWheelTypes";

/**
 * Debug behavior:
 * in local/dev we intentionally allow unlimited spins by default so the wheel
 * can be exercised repeatedly. Set PRO_TRIAL_WHEEL_DEBUG_UNLIMITED_SPINS=false
 * to disable that behavior without changing code.
 */
function isDebugUnlimitedSpinsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.PRO_TRIAL_WHEEL_DEBUG_UNLIMITED_SPINS !== "false";
}

function pickPrizeDurationDays() {
  const total = PRO_TRIAL_WHEEL_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let target = Math.random() * total;

  for (const prize of PRO_TRIAL_WHEEL_PRIZES) {
    target -= prize.weight;
    if (target <= 0) return prize.durationDays;
  }

  return PRO_TRIAL_WHEEL_PRIZES[PRO_TRIAL_WHEEL_PRIZES.length - 1].durationDays;
}

export async function getProTrialWheelStatus(userId: string): Promise<ProTrialWheelStatus> {
  const { access } = await resolveEffectiveAccess(userId);
  const debugUnlimitedSpins = isDebugUnlimitedSpinsEnabled();

  return {
    ok: true,
    userId,
    canSpin: debugUnlimitedSpins || access.plan === "basic",
    devUnlimitedSpins: debugUnlimitedSpins,
    activeTrialEndsAt:
      access.source === "promo" || access.source === "paid_subscription"
        ? (access.promoExpiresAt ?? access.subscriptionExpiresAt)?.toISOString() ?? null
        : null,
  };
}

export async function spinProTrialWheel(userId: string): Promise<ProTrialWheelSpinResult> {
  const status = await getProTrialWheelStatus(userId);
  if (!status.canSpin) {
    throw new Error("PRO_TRIAL_WHEEL_NOT_ELIGIBLE");
  }

  const prizeDurationDays = pickPrizeDurationDays();
  const codeEntry = createDebugWheelPrizeCode({
    durationDays: prizeDurationDays,
    userId,
  });

  return {
    ok: true,
    prizeDurationDays,
    code: codeEntry.code,
    codeExpiresAt: new Date(codeEntry.expiresAt).toISOString(),
    status,
  };
}
