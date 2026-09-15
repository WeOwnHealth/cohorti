import express from "express";
import cors from "cors";
import crypto from "crypto";

/**
 * WeOwnHealth Trials — Off-Chain Coordinator (OCC) + demo issuer.
 *
 * Buildathon Wave 1: all endpoints return MOCK responses. These simulate what
 * will later be real operations via Dilonne's Compact contract package:
 *   - commitment   -> real Poseidon hash of the issued credential
 *   - issuerPubkey -> real Midnight issuer public key
 *   - tx.hash      -> real on-chain tx hash on midnight-testnet
 *
 * No secrets, IPs, or real patient data handled here.
 */

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors()); // frontend runs on a different origin during dev (:3001)
app.use(express.json());

// Hardcoded Wave 1 trial (mirrors packages/contract criteria)
const THRESHOLD = 200;
const TRIAL = Object.freeze({
  trialId: "trial_001",
  name: "Cholesterol Screening Study",
  sponsor: "WeOwnHealth Research",
  criteria: {
    marker: "cholesterol",
    operator: "<=",
    threshold: THRESHOLD,
    unit: "mg/dL",
  },
  status: "active",
});

const randomHex = (bytes: number = 32) =>
  `0x${crypto.randomBytes(bytes).toString("hex")}`;

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "weownhealth-trials-occ",
    network: "midnight-testnet",
  });
});

/**
 * Issues a mock W3C credential for a biomarker and "publishes" its commitment.
 * Body: { patientId, marker, value, unit }
 * Mocks: Poseidon hash commitment, issuer pubkey, on-chain tx.
 */
app.post("/api/issue-credential", (req, res) => {
  const { patientId, marker, value, unit } = req.body ?? {};

  if (typeof value !== "number" || Number.isNaN(value)) {
    return res.status(400).json({
      success: false,
      error: "`value` must be a number",
    });
  }

  const meetsThreshold = value <= THRESHOLD;

  res.json({
    success: true,
    credential: {
      commitment: randomHex(32),
      issuerPubkey: randomHex(33),
      marker: marker ?? "cholesterol",
      threshold: THRESHOLD,
      meetsThreshold,
      issuedAt: new Date().toISOString(),
    },
    tx: {
      hash: randomHex(32),
      network: "midnight-testnet",
      status: "confirmed",
    },
  });
});

app.get("/api/trial", (_req, res) => {
  res.json(TRIAL);
});

/**
 * Verifies a mock ZK proof and returns one bit: eligible or not.
 * Body: { proofId, patientPseudonym, eligible? }
 * Mocks: local ZK proof verification (prove_claim circuit in Wave 2).
 */
app.post("/api/verify-proof", (req, res) => {
  const { proofId, patientPseudonym, eligible } = req.body ?? {};

  res.json({
    proofId: typeof proofId === "string" ? proofId : `proof_${crypto.randomBytes(3).toString("hex")}`,
    patientPseudonym: patientPseudonym ?? "patient_001",
    eligible: eligible ?? true,
    scope: "cholesterol <= 200",
    verifiedAt: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    service: "weownhealth-trials-occ",
    docs: ["GET /api/health", "POST /api/issue-credential", "GET /api/trial", "POST /api/verify-proof"],
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "not found" });
});

app.listen(PORT, () => {
  console.log(`[occ] weownhealth-trials-occ listening on :${PORT} (midnight-testnet, mocks)`);
});
