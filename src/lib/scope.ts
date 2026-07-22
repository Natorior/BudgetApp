import type { Scope } from "./queries";

export function parseScope(value: string | string[] | undefined, fallback: Scope = "all"): Scope {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "personal" || candidate === "business" || candidate === "all" ? candidate : fallback;
}
