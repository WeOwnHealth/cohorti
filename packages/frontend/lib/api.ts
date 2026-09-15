/**
 * WeOwnHealth Trials API client.
 * Points at the OCC/backend. In prod this is trials.weown.health.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Trial {
  trialId: string;
  name: string;
  sponsor: string;
  criteria: {
    marker: string;
    operator: string;
    threshold: number;
    unit: string;
  };
  status: string;
}

export interface Credential {
  commitment: string;
  issuerPubkey: string;
  marker: string;
  threshold: number;
  meetsThreshold: boolean;
  issuedAt: string;
  /** locally attached after issuance — on-chain confirm tx */
  txHash?: string;
}

export interface IssueCredentialResult {
  success: boolean;
  credential: Credential;
  tx: {
    hash: string;
    network: string;
    status: string;
  };
}

export interface VerifyProofResult {
  proofId: string;
  patientPseudonym: string;
  eligible: boolean;
  scope: string;
  verifiedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const getTrial = (): Promise<Trial> => request<Trial>("/api/trial");

export const issueCredential = (body: {
  patientId: string;
  marker: string;
  value: number;
  unit: string;
}): Promise<IssueCredentialResult> =>
  request<IssueCredentialResult>("/api/issue-credential", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const verifyProof = (body: {
  proofId: string;
  patientPseudonym: string;
  eligible: boolean;
}): Promise<VerifyProofResult> =>
  request<VerifyProofResult>("/api/verify-proof", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const truncateHash = (hash: string, chars = 10): string =>
  hash.length > chars * 2 + 3 ? `${hash.slice(0, chars)}…${hash.slice(-4)}` : hash;
