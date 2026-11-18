// Canonical JSON + SHA-256 used by every parity participant (server, web, mobile).
// Keys sorted recursively; no whitespace; numbers via JSON.stringify (engine already rounds Elo to 4dp).
import { createHash } from "node:crypto";

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}

export function stateHash(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
