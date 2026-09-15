import type { FastifyInstance } from "fastify";
import type { DisclosureRequest } from "@cohorti/shared-types";
import { evaluateDisclosureRequest } from "./policy.js";
import * as store from "./store.js";

interface EvaluateBody extends DisclosureRequest {
  holderApproved: boolean;
}

export function registerRoutes(app: FastifyInstance): void {
  /**
   * The single entry point services/verifier-api calls before ever invoking
   * the Midnight prover. Never returns or logs the underlying health value —
   * only the gate decision. See README.md § "6. Proof Request & Disclosure
   * Control".
   */
  app.post<{ Body: EvaluateBody }>("/evaluate", async (req, reply) => {
    const { verifierId, credentialId, claimSchemaId, holderApproved } = req.body;

    const credential = store.getCredential(credentialId);
    const claimSchema = store.getClaimSchema(claimSchemaId);
    if (!credential || !claimSchema) {
      return reply.code(404).send({ error: "unknown credential or claim schema" });
    }

    const envelope = store.getEnvelope(verifierId);
    const budget = store.getBudget(verifierId, credentialId);
    const priorEntries = store.getPriorEntries(verifierId, credentialId);

    const decision = evaluateDisclosureRequest({
      credential,
      claimSchema,
      envelope,
      budget,
      priorEntries,
      holderApproved,
    });

    if (decision.outcome === "APPROVED" && budget) {
      store.consumeBudget(budget, new Date());
    }

    return reply.send(decision);
  });

  /** Records the outcome of a proof — including negative results, which are disclosures in their own right. */
  app.post("/sharing-log", async (req, reply) => {
    const body = req.body as {
      proofId: string;
      verifierId: string;
      credentialId: string;
      claimSchemaId: string;
      result: boolean;
    };
    const claimSchema = store.getClaimSchema(body.claimSchemaId);
    store.appendSharingLogEntry({
      ...body,
      timestamp: new Date().toISOString(),
      isNegativeDisclosure: body.result === false,
      markerKey: claimSchema?.markerKey,
    });
    return reply.code(201).send({ recorded: true });
  });
}
