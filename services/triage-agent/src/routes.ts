import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { AuditTrace } from "@cohorti/shared-types";
import { evaluateCohort, type CandidateRecord, type TrialCriterion } from "./screening.js";
import * as traceStore from "./trace-store.js";

interface ScreenBody {
  trialId: string;
  candidates: CandidateRecord[];
  criteria: TrialCriterion[];
  /**
   * This service's verifiable identity. Required, not defaulted: an
   * unidentified agent must not produce a trace. The identity/verification
   * mechanism itself (ERC-7857 on EVM, a Midnight-native scheme, or
   * otherwise) is deliberately not implemented yet — see
   * packages/shared-types/src/agent.ts's AuditTrace.agentIdentity — so
   * nothing here validates this string against a registry. It's accepted
   * and recorded, not yet verified.
   */
  agentIdentity: string;
}

export function registerRoutes(app: FastifyInstance): void {
  /**
   * Screens a de-identified population and returns a candidate list +
   * reasoning, wrapped in an AuditTrace with humanReviewed: false. Nothing
   * downstream of this service may treat these decisions as final —
   * README.md's human-review requirement (GDPR Art. 22: no solely automated
   * decision may determine trial access) is enforced by the coordinator
   * approving/overriding via apps/coordinator-console before Phase B.
   */
  app.post<{ Body: ScreenBody }>("/screen", async (req, reply) => {
    const { trialId, candidates, criteria, agentIdentity } = req.body;

    const decisions = evaluateCohort(candidates, criteria);

    const trace: AuditTrace = {
      id: randomUUID(),
      agentIdentity,
      trialId,
      decisions,
      // TODO(cohorti): populate with the real OpenTelemetry trace reference
      // once this service emits spans to services/audit rather than just
      // returning the decisions inline.
      otelTraceRef: "",
      createdAt: new Date().toISOString(),
      humanReviewed: false,
    };

    // TODO(cohorti): POST `trace` to services/audit here so it's durably
    // recorded even if the coordinator never opens the review UI.
    traceStore.save(trace);

    return reply.code(201).send(trace);
  });

  app.get<{ Params: { id: string } }>("/audit-traces", async (_req, reply) => {
    return reply.send(traceStore.list());
  });

  app.get<{ Params: { id: string } }>("/audit-traces/:id", async (req, reply) => {
    const trace = traceStore.get(req.params.id);
    if (!trace) return reply.code(404).send({ error: "not found" });
    return reply.send(trace);
  });

  /**
   * The GDPR Art. 22 gate, made concrete: a qualified human — using
   * apps/coordinator-console — calls this after reviewing every inclusion
   * and exclusion in the trace. Nothing else in this service may set
   * humanReviewed; there is deliberately no "auto-approve" path.
   */
  app.patch<{ Params: { id: string } }>("/audit-traces/:id/review", async (req, reply) => {
    const trace = traceStore.markReviewed(req.params.id);
    if (!trace) return reply.code(404).send({ error: "not found" });
    return reply.send(trace);
  });
}
