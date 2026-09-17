/**
 * Trial-eligibility screening logic. Pure and I/O-free, like
 * services/disclosure-guard's policy.ts, so it's unit-tested without a
 * server. Operates only on already de-identified records — this service
 * runs entirely inside the institutional boundary (README.md § "Phase A").
 *
 * IMPORTANT: every candidate gets a decision with `reasoning`, including
 * candidates who are *included* — README.md is explicit that "a wrongly
 * excluded eligible patient is invisible unless exclusions are logged," so
 * exclusions here are first-class outputs, not a filtered-out remainder.
 */
import type { TriageDecision } from "@passport/shared-types";

export type CriterionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in";

export interface TrialCriterion {
  /** Field name on the de-identified candidate record, e.g. "age_years", "diagnosis_code". */
  attribute: string;
  operator: CriterionOperator;
  value: unknown;
  /** Human-readable statement shown in the coordinator review UI and in the reasoning trail. */
  description: string;
}

/** A de-identified candidate record — field values only, no identifiers. `ref` is an opaque, non-reversible pointer the institution's own systems can resolve internally; this service never sees a name or MRN. */
export interface CandidateRecord {
  ref: string;
  fields: Record<string, unknown>;
}

export function evaluateCandidate(candidate: CandidateRecord, criteria: TrialCriterion[]): TriageDecision {
  const results = criteria.map((criterion) => ({
    criterion,
    passed: evaluateCriterion(candidate.fields[criterion.attribute], criterion),
  }));

  const included = results.every((r) => r.passed);
  const reasoning = results
    .map((r) => `${r.passed ? "PASS" : "FAIL"}: ${r.criterion.description}`)
    .join("; ");

  return {
    candidateRef: candidate.ref,
    included,
    reasoning: reasoning || "no criteria supplied",
    criteriaEvaluated: criteria.map((c) => c.description),
  };
}

export function evaluateCohort(
  candidates: CandidateRecord[],
  criteria: TrialCriterion[],
): TriageDecision[] {
  return candidates.map((candidate) => evaluateCandidate(candidate, criteria));
}

function evaluateCriterion(fieldValue: unknown, criterion: TrialCriterion): boolean {
  switch (criterion.operator) {
    case "eq":
      return fieldValue === criterion.value;
    case "neq":
      return fieldValue !== criterion.value;
    case "gt":
      return compareOrdered(fieldValue, criterion.value, (a, b) => a > b);
    case "gte":
      return compareOrdered(fieldValue, criterion.value, (a, b) => a >= b);
    case "lt":
      return compareOrdered(fieldValue, criterion.value, (a, b) => a < b);
    case "lte":
      return compareOrdered(fieldValue, criterion.value, (a, b) => a <= b);
    case "in":
      return Array.isArray(criterion.value) && criterion.value.includes(fieldValue);
    case "not_in":
      return Array.isArray(criterion.value) && !criterion.value.includes(fieldValue);
  }
}

/**
 * A type guard on two independent `unknown` parameters only narrows the
 * parameter it's declared against (`a is X`) — the other stays `unknown` at
 * the call site even after a runtime check that covers both. Comparing
 * inline here, instead of guarding-then-comparing at the call site, avoids
 * that gap entirely rather than reaching for a type assertion.
 */
function compareOrdered(a: unknown, b: unknown, cmp: (a: number | string, b: number | string) => boolean): boolean {
  if (typeof a === "number" && typeof b === "number") return cmp(a, b);
  if (typeof a === "string" && typeof b === "string") return cmp(a, b);
  return false;
}
