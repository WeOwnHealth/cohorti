/**
 * In-memory chain store — swap for an append-only table (Postgres is fine;
 * the tamper-evidence comes from the hash chain, not the storage engine)
 * before this leaves local dev. See services/disclosure-guard/src/store.ts
 * for the same caveat pattern.
 */
import { appendEntry, GENESIS_DIGEST, type ChainEntry } from "./chain.js";

const entries: ChainEntry[] = [];

export function append(content: string): ChainEntry {
  const previousDigest = entries.at(-1)?.chainDigest ?? GENESIS_DIGEST;
  const entry = appendEntry(previousDigest, entries.length, content);
  entries.push(entry);
  return entry;
}

export function getAll(): ChainEntry[] {
  return [...entries];
}

export function getLatestDigest(): string {
  return entries.at(-1)?.chainDigest ?? GENESIS_DIGEST;
}
