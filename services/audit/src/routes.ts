import type { FastifyInstance } from "fastify";
import { verifyChain } from "./chain.js";
import * as store from "./store.js";

export function registerRoutes(app: FastifyInstance): void {
  /** Accepts any JSON-serializable audit-worthy event (an AuditTrace, a verification event, a refusal attempt). */
  app.post("/events", async (req, reply) => {
    const entry = store.append(JSON.stringify(req.body));
    return reply.code(201).send({ index: entry.index, chainDigest: entry.chainDigest });
  });

  app.get("/events", async (_req, reply) => {
    return reply.send(store.getAll());
  });

  /** Recomputes the whole chain and confirms nothing was altered. */
  app.get("/verify", async (_req, reply) => {
    return reply.send(verifyChain(store.getAll()));
  });

  /**
   * The digest a periodic job should anchor via
   * contracts/evm/src/AuditAnchor.sol. Anchoring isn't wired up yet — see
   * that contract's NatSpec and this service's README for the plan.
   */
  app.get("/latest-digest", async (_req, reply) => {
    return reply.send({ chainDigest: store.getLatestDigest() });
  });
}
