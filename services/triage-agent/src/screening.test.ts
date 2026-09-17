import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCandidate, evaluateCohort, type CandidateRecord, type TrialCriterion } from "./screening.js";

const ageCriterion: TrialCriterion = {
  attribute: "age_years",
  operator: "gte",
  value: 18,
  description: "Age at least 18 years",
};
const diagnosisCriterion: TrialCriterion = {
  attribute: "diagnosis_code",
  operator: "in",
  value: ["E11.9", "E11.8"],
  description: "Diagnosis code is E11.9 or E11.8",
};

test("includes a candidate who satisfies every criterion, with reasoning recorded", () => {
  const candidate: CandidateRecord = { ref: "cand-1", fields: { age_years: 42, diagnosis_code: "E11.9" } };
  const decision = evaluateCandidate(candidate, [ageCriterion, diagnosisCriterion]);
  assert.equal(decision.included, true);
  assert.match(decision.reasoning, /PASS: Age at least 18 years/);
  assert.match(decision.reasoning, /PASS: Diagnosis code is E11.9 or E11.8/);
  assert.deepEqual(decision.criteriaEvaluated, [ageCriterion.description, diagnosisCriterion.description]);
});

test("excludes a candidate failing even one criterion, and records WHY — exclusions are never silent", () => {
  const candidate: CandidateRecord = { ref: "cand-2", fields: { age_years: 15, diagnosis_code: "E11.9" } };
  const decision = evaluateCandidate(candidate, [ageCriterion, diagnosisCriterion]);
  assert.equal(decision.included, false);
  assert.match(decision.reasoning, /FAIL: Age at least 18 years/);
  assert.match(decision.reasoning, /PASS: Diagnosis code is E11.9 or E11.8/);
});

test("evaluateCohort returns one decision per candidate, order preserved", () => {
  const candidates: CandidateRecord[] = [
    { ref: "cand-1", fields: { age_years: 42, diagnosis_code: "E11.9" } },
    { ref: "cand-2", fields: { age_years: 15, diagnosis_code: "E11.9" } },
  ];
  const decisions = evaluateCohort(candidates, [ageCriterion]);
  assert.equal(decisions.length, 2);
  assert.equal(decisions[0]?.candidateRef, "cand-1");
  assert.equal(decisions[0]?.included, true);
  assert.equal(decisions[1]?.candidateRef, "cand-2");
  assert.equal(decisions[1]?.included, false);
});

test("a candidate missing the field entirely fails the criterion rather than throwing", () => {
  const candidate: CandidateRecord = { ref: "cand-3", fields: {} };
  const decision = evaluateCandidate(candidate, [ageCriterion]);
  assert.equal(decision.included, false);
});
