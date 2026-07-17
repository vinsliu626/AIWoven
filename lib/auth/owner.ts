export type OwnerIdentity = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
};

function normalize(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function configuredValues(name: "OWNER_EMAIL" | "OWNER_USER_ID") {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map(normalize)
      .filter((value): value is string => Boolean(value))
  );
}

export function isOwnerIdentity(identity: OwnerIdentity | null | undefined) {
  if (!identity) return false;
  if (identity.role === "OWNER") return true;
  const id = normalize(identity.id);
  const email = normalize(identity.email);
  return Boolean(
    (id && configuredValues("OWNER_USER_ID").has(id)) ||
      (email && configuredValues("OWNER_EMAIL").has(email))
  );
}

export function hasOwnerConfiguration() {
  return configuredValues("OWNER_EMAIL").size > 0 || configuredValues("OWNER_USER_ID").size > 0;
}
