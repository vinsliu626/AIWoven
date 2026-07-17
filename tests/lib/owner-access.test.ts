import { afterEach, describe, expect, it } from "vitest";
import { isOwnerIdentity } from "@/lib/auth/owner";
import { resolveEffectiveAccessFromEntitlement } from "@/lib/billing/access";
import type { RuntimeUserEntitlement } from "@/lib/billing/entitlementDb";

const base = { id:"e", userId:"owner-id", plan:"basic", createdAt:new Date(), updatedAt:new Date(), stripeCustomerId:null, stripeStatus:null, stripeSubId:null, canSeeSuspiciousSentences:false, chatPerDay:1, detectorWordsPerWeek:1, noteSecondsPerWeek:1, unlimited:false, cancelAtPeriodEnd:false, currentPeriodEnd:null, dailyUsageKey:null, unlimitedSource:null, weeklyUsageKey:null, usedChatCountToday:99, usedDetectorWordsThisWeek:99, usedNoteSecondsThisWeek:99, developerBypass:false, promoPlan:null, promoAccessStartAt:null, promoAccessEndAt:null, promoAccessActive:false, role:"USER" } satisfies RuntimeUserEntitlement;

describe("owner access", () => {
  afterEach(()=>{ delete process.env.OWNER_EMAIL; delete process.env.OWNER_USER_ID; });
  it("does not grant owner access to an ordinary user",()=>expect(isOwnerIdentity({id:"user-id",email:"user@example.com",role:"USER"})).toBe(false));
  it("recognizes securely configured owner identity",()=>{ process.env.OWNER_USER_ID="owner-id"; expect(resolveEffectiveAccessFromEntitlement("owner-id",base).source).toBe("owner"); expect(resolveEffectiveAccessFromEntitlement("owner-id",base).unlimited).toBe(true); });
  it("recognizes a persisted OWNER role",()=>expect(resolveEffectiveAccessFromEntitlement("owner-id",{...base,role:"OWNER"}).unlimited).toBe(true));
});
