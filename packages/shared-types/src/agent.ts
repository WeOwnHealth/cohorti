/** One inclusion or exclusion decision the triage agent made for a single candidate. */
export interface TriageDecision {
  candidateRef: string; // opaque, de-identified reference — never a name or MRN
  included: boolean;
  /** Required even for inclusions — an audit trail with only exclusion reasons is half an audit trail. */
  reasoning: string;
  criteriaEvaluated: string[];
}

/**
 * Immutable execution trace — OpenTelemetry to an audit store, with a
 * digest meant to be anchored on-chain per README.md's requirement.
 * On-chain anchoring is not scaffolded yet (see services/audit's README) —
 * an earlier EVM-based implementation (contracts/evm/AuditAnchor.sol) was
 * removed to avoid assuming a chain ahead of a team decision. Exclusions
 * are captured with the same weight as inclusions: README.md is explicit
 * that "a wrongly excluded eligible patient is invisible unless exclusions
 * are logged."
 */
export interface AuditTrace {
  id: string;
  /**
   * Opaque, verifiable identifier for the agent that produced this trace.
   * README.md's spec calls for this to be an ERC-7857 on-chain identity
   * (see § "Agentic layer") — that implementation is deliberately not
   * scaffolded yet, pending team agreement on the identity/verification
   * mechanism (EVM/ERC-7857, a Midnight-native scheme, or otherwise). This
   * field stays a plain string so nothing downstream is coupled to a
   * specific chain or format ahead of that decision.
   */
  agentIdentity: string;
  trialId: string;
  decisions: TriageDecision[];
  otelTraceRef: string;
  /** Set once the trace has been hashed and anchored; undefined until then. */
  onChainDigest?: string;
  createdAt: string; // ISO 8601
  /** True once a qualified human has reviewed the candidate list this trace produced — see README.md's hard human-review requirement. */
  humanReviewed: boolean;
}
