import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { BindingTier } from "@passport/shared-types";
import { evaluateDisclosure, recordSharingLog } from "./disclosure-guard-client.js";
import { generateProof } from "./midnight-prover.js";

interface ProofRequestBody {
  verifierId: string;
  credentialId: string;
  claimSchemaId: string;
  /** Resolved from the holder's response to the consent prompt shown by apps/holder-web. */
  holderApproved: boolean;
}

export function registerRoutes(app: FastifyInstance): void {
  /**
   * The only endpoint a verifier calls. Returns pass/fail + binding tier +
   * recency — never the underlying value, and never a raw-data fallback on
   * refusal. See README.md § "Provide a verifier API returning a pass/fail
   * result plus binding tier and recency, with no access to underlying data."
   */
  app.post<{ Body: ProofRequestBody }>("/proof-requests", async (req, reply) => {
    const { verifierId, credentialId, claimSchemaId, holderApproved } = req.body;

    const decision = await evaluateDisclosure({
      verifierId,
      credentialId,
      claimSchemaId,
      holderApproved,
    });

    if (decision.outcome === "REFUSED") {
      // TODO(passport): forward refusal attempts to services/audit — the
      // activity diagram's "REFUSE + log attempt" branches (envelope and
      // laddering refusals in particular) expect this to be visible, not
      // just returned to the caller.
      return reply.code(403).send({ result: null, reason: decision.reason });
    }

    // TODO(passport): resolve the credential's real binding tier from
    // services/issuance rather than hardcoding a placeholder — the request
    // body deliberately doesn't carry it, since a caller-supplied tier
    // could never be trusted. T0_UNBOUND here is a placeholder that must
    // not ship; generateProof() throws until this lookup is wired in.
    const proof = await generateProof({
      claimType: "THRESHOLD",
      credentialId,
      claimSchemaId,
      bindingTier: BindingTier.T0_UNBOUND,
    });

    const proofId = randomUUID();
    await recordSharingLog({
      proofId,
      verifierId,
      credentialId,
      claimSchemaId,
      result: proof.result,
    });

    return reply.send({
      result: proof.result,
      recency: proof.recency,
      // bindingTier intentionally omitted from this stub response until the
      // TODO above resolves it — never fabricate a tier value here.
    });
  });
}
