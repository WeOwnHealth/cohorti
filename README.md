# WeOwnHealth Trials — Health Markers Passport

> ZK clinical-trial matching on Midnight Network. Patients prove eligibility without disclosing lab values.

## What It Does

Patients receive verifiable credentials for their health biomarkers. Using Midnight's dual-ledger model, they can prove claims like "my cholesterol is at or below 200 mg/dL" to clinical trial sponsors -- without revealing the actual number. The sponsor sees one bit: eligible or not eligible.

## Architecture

**Midnight Dual-Ledger Model:**
- **Public state** (on-chain): credential commitments, issuer public keys, trial criteria
- **Private state** (patient wallet): raw biomarker values, PII, consent records, ZK proof witnesses

**Components:**
- `packages/contract/` — Compact contract with 2 circuits: `issue_credential` + `prove_claim` (TypeScript-flavored, deployed to Midnight testnet)
- `packages/backend/` — Off-Chain Coordinator (OCC) + demo issuer. Node.js/Express service that issues W3C Verifiable Credentials and coordinates trial matching
- `packages/frontend/` — Next.js app with patient wallet UI + trial sponsor verifier UI

**Flow:**
1. Lab data → Backend issues credential → commitment published on-chain
2. Patient stores credential in Lace wallet (private)
3. Trial sponsor publishes criteria (public)
4. Patient generates ZK proof locally → submits `prove_claim` tx
5. Sponsor reads result: eligible or not eligible. No raw values disclosed.

## Wave 1 Scope

- 2-circuit Compact contract (issue + prove)
- Single hardcoded trial: cholesterol at or below 200 mg/dL
- Mock lab data (real integrations in Wave 2)
- Wallet-pull delivery pattern
- Demo frontend with patient/sponsor role switcher

## Wave 2 Roadmap (Sep 27 -- Oct 17)
- Credential revocation circuits
- Split backend into Attestation Service + separate OCC
- WebSocket push notifications
- FHIR standardization pipeline
- ClinicalTrials.gov API integration
- Additional verifier UIs (insurance, employer, etc.)

## Wave 3 Roadmap (Oct 27 -- Nov 16)
- Ai Triage Agent + ERC-7857 verifiable identity
- PII redaction (local LLM)
- Real lab/wearable integrations (Function, Quest, Whoop, Oura)
- SigNoz + OpenTelemetry observability

## Quick Start

```bash
# Install dependencies
npm install

# Start backend
cd packages/backend
npm run dev

# Start frontend (separate terminal)
cd packages/frontend
npm run dev
```

> Wave 1 note: the backend returns **mock** responses (random hex commitments, thresholds, tx hashes). Dilonne's contract package (`packages/contract/`) is not pushed yet — real Poseidon hashes + on-chain txs wire in once it lands. The demo flow works end-to-end with mocks.

## Tech Stack

- **Contract:** Midnight Compact (TypeScript-flavored ZK circuits)
- **Backend:** Node.js, Express, TypeScript
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Blockchain:** Midnight Network (testnet)
- **Wallet:** Lace (Midnight-native)

## License

Apache-2.0 (Midnight-related code)

## Team

Built by WeOwnHealth for the Midnight Network Buildathon (Sep 2026).
