import { NextResponse } from "next/server";
import { getUserIdOrDev } from "@/lib/auth/devUser";
import { getProTrialWheelStatus } from "@/lib/billing/proTrialWheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getUserIdOrDev(req);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "AUTH_REQUIRED", message: "Please sign in to use the Pro trial wheel." },
      { status: 401 }
    );
  }

  try {
    const status = await getProTrialWheelStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("[billing.wheel.status] failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "PRO_TRIAL_WHEEL_STATUS_FAILED" }, { status: 500 });
  }
}
