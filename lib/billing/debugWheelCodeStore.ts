import { randomBytes } from "crypto";

/**
 * Debug/local-only in-memory prize code storage.
 *
 * This is intentionally NOT production-safe:
 * - process memory is per-instance
 * - Vercel/serverless instances do not share this map
 * - restarts clear all codes
 *
 * Production should move these one-time codes to Redis/KV or a DB-backed store.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const TOMBSTONE_TTL_MS = 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type ActivePrizeCode = {
  code: string;
  durationDays: number;
  userId: string | null;
  expiresAt: number;
  createdAt: number;
};

type UsedPrizeCode = {
  code: string;
  userId: string | null;
  usedAt: number;
  cleanupAt: number;
};

type ExpiredPrizeCode = {
  code: string;
  expiredAt: number;
  cleanupAt: number;
};

type DebugWheelStore = {
  active: Map<string, ActivePrizeCode>;
  used: Map<string, UsedPrizeCode>;
  expired: Map<string, ExpiredPrizeCode>;
  cleanupStarted: boolean;
};

const globalForDebugWheelStore = globalThis as unknown as {
  debugWheelStore?: DebugWheelStore;
};

const store =
  globalForDebugWheelStore.debugWheelStore ??
  {
    active: new Map<string, ActivePrizeCode>(),
    used: new Map<string, UsedPrizeCode>(),
    expired: new Map<string, ExpiredPrizeCode>(),
    cleanupStarted: false,
  };

if (!globalForDebugWheelStore.debugWheelStore) {
  globalForDebugWheelStore.debugWheelStore = store;
}

function randomChars(length: number) {
  let out = "";
  const bytes = randomBytes(length * 2);

  for (let i = 0; i < bytes.length && out.length < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return out;
}

function normalize(code: string) {
  return code.trim().toUpperCase();
}

function cleanup(now = Date.now()) {
  for (const [code, entry] of store.active) {
    if (entry.expiresAt <= now) {
      store.active.delete(code);
      store.expired.set(code, {
        code,
        expiredAt: entry.expiresAt,
        cleanupAt: now + TOMBSTONE_TTL_MS,
      });
    }
  }

  for (const [code, entry] of store.used) {
    if (entry.cleanupAt <= now) {
      store.used.delete(code);
    }
  }

  for (const [code, entry] of store.expired) {
    if (entry.cleanupAt <= now) {
      store.expired.delete(code);
    }
  }
}

function ensureCleanupTimer() {
  if (store.cleanupStarted) return;
  store.cleanupStarted = true;

  if (process.env.NODE_ENV !== "production") {
    const timer = setInterval(() => cleanup(), 60_000);
    if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") {
      timer.unref();
    }
  }
}

function makeCode(durationDays: number) {
  const prefix = `PRO${durationDays}`;
  const suffix = randomChars(5);
  return `${prefix}-${suffix}`;
}

export function isProbableDebugWheelCode(code: string) {
  return /^PRO\d{1,2}-[A-Z0-9]{5}$/.test(normalize(code));
}

export function createDebugWheelPrizeCode({
  durationDays,
  userId,
  now = Date.now(),
}: {
  durationDays: number;
  userId: string | null;
  now?: number;
}) {
  cleanup(now);
  ensureCleanupTimer();

  let code = makeCode(durationDays);
  while (store.active.has(code) || store.used.has(code) || store.expired.has(code)) {
    code = makeCode(durationDays);
  }

  const entry: ActivePrizeCode = {
    code,
    durationDays,
    userId,
    expiresAt: now + CODE_TTL_MS,
    createdAt: now,
  };

  store.active.set(code, entry);
  return entry;
}

export function inspectDebugWheelPrizeCode({
  code,
  userId,
  now = Date.now(),
}: {
  code: string;
  userId: string | null;
  now?: number;
}) {
  cleanup(now);

  const normalized = normalize(code);
  const active = store.active.get(normalized);
  if (active) {
    if (active.userId && userId && active.userId !== userId) {
      return { kind: "wrong_user" as const };
    }
    return { kind: "active" as const, entry: active };
  }

  if (store.used.has(normalized)) {
    return { kind: "used" as const };
  }

  if (store.expired.has(normalized)) {
    return { kind: "expired" as const };
  }

  return { kind: "missing" as const };
}

export function consumeDebugWheelPrizeCode({
  code,
  userId,
  now = Date.now(),
}: {
  code: string;
  userId: string | null;
  now?: number;
}) {
  cleanup(now);

  const normalized = normalize(code);
  const match = inspectDebugWheelPrizeCode({ code: normalized, userId, now });
  if (match.kind !== "active") {
    return { ok: false as const, status: match.kind };
  }

  store.active.delete(normalized);
  store.used.set(normalized, {
    code: normalized,
    userId: match.entry.userId,
    usedAt: now,
    cleanupAt: now + TOMBSTONE_TTL_MS,
  });

  return {
    ok: true as const,
    code: normalized,
    durationDays: match.entry.durationDays,
    expiresAt: match.entry.expiresAt,
  };
}
