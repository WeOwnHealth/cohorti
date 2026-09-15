import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { BindingTier, Credential, FhirRef } from "@cohorti/shared-types";
import * as store from "./store.js";

interface IssueBody {
  holderId: string;
  issuerId: string;
  bindingTier: BindingTier;
  observationDate: string;
  validityPeriod: string;
  fhirResource: FhirRef;
}

export function registerRoutes(app: FastifyInstance): void {
  /**
   * Signs and issues a credential. TODO(cohorti): actually sign it — this
   * stub persists the credential shape but does not yet produce or attach
   * a real signature. Do not treat `issue()`'s output as a trustworthy
   * credential until that's wired in; see README.md's requirement that a
   * credential carry "issuer identity and accreditation level."
   */
  app.post<{ Body: IssueBody }>("/credentials", async (req, reply) => {
    const body = req.body;
    const credential: Credential = {
      id: randomUUID(),
      issuerId: body.issuerId,
      observationDate: body.observationDate,
      bindingTier: body.bindingTier,
      validityPeriod: body.validityPeriod,
      issuedAt: new Date().toISOString(),
      state: "ACTIVE",
      fhirResource: body.fhirResource,
      revoked: false,
    };
    store.issue(body.holderId, credential);
    return reply.code(201).send(credential);
  });

  app.get<{ Querystring: { holderId: string } }>("/credentials", async (req, reply) => {
    const { holderId } = req.query;
    if (!holderId) return reply.code(400).send({ error: "holderId query param required" });
    return reply.send(store.listForHolder(holderId));
  });
}
