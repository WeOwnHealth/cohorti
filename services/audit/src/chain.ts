/**
 * Tamper-evident hash chain: entry N's digest commits to entry N's content
 * AND entry N-1's digest, so altering any historical entry changes every
 * digest after it. This is what "digest anchored on-chain" in README.md
 * actually protects — periodically anchoring the *latest* digest on-chain
 * (chain TBD, see this service's README) means anyone can later prove the
 * off-chain log wasn't rewritten, by recomputing the chain and comparing
 * to the anchored value.
 *
 * A simple chain (not a Merkle tree) is enough for tamper-evidence of the
 * whole log; a Merkle tree would additionally let you prove a single entry's
 * inclusion without replaying every entry before it. Worth upgrading to if
 * per-entry inclusion proofs become a real requirement — not needed yet.
 */
import { createHash } from "node:crypto";

export interface ChainEntry {
  /** Sequence position, starting at 0. */
  index: number;
  /** Caller-supplied payload — e.g. a JSON-stringified AuditTrace. */
  content: string;
  /** This entry's own content hash. */
  contentDigest: string;
  /** The previous entry's chainDigest, or a fixed genesis value for index 0. */
  previousDigest: string;
  /** sha256(contentDigest + previousDigest) — this entry's commitment to the whole chain so far. */
  chainDigest: string;
  createdAt: string; // ISO 8601
}

export const GENESIS_DIGEST = sha256("cohorti-audit-genesis");

export function appendEntry(previousDigest: string, index: number, content: string): ChainEntry {
  const contentDigest = sha256(content);
  const chainDigest = sha256(contentDigest + previousDigest);
  return {
    index,
    content,
    contentDigest,
    previousDigest,
    chainDigest,
    createdAt: new Date().toISOString(),
  };
}

/** Recomputes the chain from a sequence of entries and confirms every digest matches — the tamper check. */
export function verifyChain(entries: ChainEntry[]): { valid: boolean; brokenAtIndex?: number } {
  let expectedPrevious = GENESIS_DIGEST;
  for (const entry of entries) {
    const expectedContentDigest = sha256(entry.content);
    const expectedChainDigest = sha256(expectedContentDigest + expectedPrevious);
    if (
      entry.previousDigest !== expectedPrevious ||
      entry.contentDigest !== expectedContentDigest ||
      entry.chainDigest !== expectedChainDigest
    ) {
      return { valid: false, brokenAtIndex: entry.index };
    }
    expectedPrevious = entry.chainDigest;
  }
  return { valid: true };
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
