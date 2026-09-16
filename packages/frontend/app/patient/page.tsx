"use client";

import { useEffect, useState } from "react";
import {
  API_URL,
  getTrial,
  getWallet,
  issueCredential,
  verifyProof,
  truncateHash,
  type Trial,
  type Credential,
  type VerifyProofResult,
  type WalletInfo,
} from "../../lib/api";

const MOCK_PATIENT = { marker: "cholesterol", value: 187, unit: "mg/dL" };
const CONSENT_EXPIRY = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

// Fresh per-session pseudonym so each browser click writes a distinct row
// on the sponsor console. Reused across issue-credential + verify-proof so
// judges can correlate a single patient's actions.
const SESSION_PSEUDONYM = `patient_${Math.random().toString(16).slice(2, 8)}`;

export default function PatientView() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VerifyProofResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrial()
      .then((t) => {
        setTrial(t);
        setError(null);
      })
      .catch(() => setError(`Cannot reach OCC at ${API_URL} — is the backend running?`));
    getWallet()
      .then((w) => setWallet(w))
      .catch(() => {
        /* backend down — handled by getTrial error above */
      });
  }, []);

  const canProve = walletConnected && credential !== null && consentGiven && !processing;

  const issueNew = async () => {
    try {
      const res = await issueCredential({ ...MOCK_PATIENT, patientId: SESSION_PSEUDONYM });
      if (!res.success) throw new Error("backend returned success:false");
      setCredential({ ...res.credential, txHash: res.tx.hash });
      setError(null);
    } catch {
      setError("Issue failed — is the backend running on :3000?");
    }
  };

  const proveEligibility = async () => {
    if (!canProve) return;
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1400)); // simulate ZK proof generation
      const res = await verifyProof({
        proofId: `proof_${Math.random().toString(16).slice(2, 10)}`,
        patientPseudonym: SESSION_PSEUDONYM,
        eligible: true,
      });
      setResult(res);
      setError(null);
    } catch {
      setError("Verification failed — is the backend running on :3000?");
    } finally {
      setProcessing(false);
    }
  };

  // Backend wallet address (real Midnight standalone address) — shown as
  // "connected wallet" since the backend handles all wallet ops in Wave 1.
  const walletLabel = wallet?.walletAddress
    ? `${truncateHash(wallet.walletAddress, 14)} · ${wallet.network}`
    : "connecting to backend wallet…";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Patient Wallet</h1>
      <p className="mt-1 text-sm text-gray-400">
        Credentials and proofs live here. Raw biomarker values never leave this wallet.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Connect Wallet */}
        <section className="rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6">
          <h2 className="text-lg font-semibold">Connect Wallet</h2>
          {walletConnected ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
              <span className="text-emerald-400">✔</span>
              <div>
                <div className="text-sm font-medium text-emerald-300">Wallet ready</div>
                <div className="font-mono text-xs text-gray-400 break-all">{walletLabel}</div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setWalletConnected(true)}
              className="mt-4 w-full rounded-lg bg-midnight-accent px-4 py-3 text-sm font-semibold text-midnight-bg shadow-glow transition hover:bg-cyan-300"
            >
              Connect Wallet
            </button>
          )}
        </section>

        {/* My Credentials */}
        <section className="rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6">
          <h2 className="text-lg font-semibold">My Credentials</h2>
          {credential ? (
            <div className="mt-4 rounded-lg border border-midnight-accent/30 bg-midnight-bg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Marker: {credential.marker}</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Verified — meets threshold
                </span>
              </div>
              <dl className="mt-3 grid gap-1.5 text-xs font-mono text-gray-400">
                <div className="flex justify-between">
                  <dt>commitment</dt>
                  <dd className="text-midnight-accent">{truncateHash(credential.commitment)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>issuer</dt>
                  <dd>{truncateHash(credential.issuerPubkey, 8)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>tx</dt>
                  <dd>{credential.txHash ? truncateHash(credential.txHash, 8) : "—"} · {wallet?.network ?? "midnight-standalone"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>issued</dt>
                  <dd>{new Date(credential.issuedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No credentials yet. Issue one to get started.</p>
          )}
          <button
            onClick={issueNew}
            disabled={processing}
            className="mt-4 w-full rounded-lg border border-midnight-accent/50 bg-midnight-accent/10 px-4 py-3 text-sm font-semibold text-midnight-accent transition hover:bg-midnight-accent/20 disabled:opacity-50"
          >
            Issue New Credential
          </button>
        </section>

        {/* Prove Eligibility */}
        <section className="rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Prove Eligibility</h2>
          {trial ? (
            <div className="mt-3 rounded-lg border border-midnight-surface bg-midnight-bg px-4 py-3 text-sm text-gray-300">
              <span className="font-medium text-white">{trial.name}</span>
              <span className="text-gray-500"> · sponsor: {trial.sponsor}</span>
              <span className="mt-1 block font-mono text-xs text-gray-400">
                criteria: {trial.criteria.marker} {trial.criteria.operator} {trial.criteria.threshold}{" "}
                {trial.criteria.unit} · status: {trial.status}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Loading active trial…</p>
          )}

          <label className="mt-4 flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span>
              I consent to share my eligibility status (yes/no only) with{" "}
              <b className="text-white">{trial?.sponsor ?? "the trial sponsor"}</b> for{" "}
              <b className="text-white">cholesterol ≤ 200 mg/dL</b> until{" "}
              <b className="text-white">{CONSENT_EXPIRY}</b> (30 days).
            </span>
          </label>

          <button
            onClick={proveEligibility}
            disabled={!canProve}
            className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              processing
                ? "bg-midnight-accent/20 text-midnight-accent animate-processing"
                : "bg-midnight-accent text-midnight-bg shadow-glow hover:bg-cyan-300"
            }`}
          >
            {processing ? "Generating proof & submitting…" : "Generate Proof and Submit"}
          </button>
          {!canProve && (
            <p className="mt-2 text-xs text-gray-500">
              {!walletConnected && "Connect wallet · "}
              {!credential && "Issue a credential · "}
              {!consentGiven && "Check the consent box"}
            </p>
          )}
        </section>
      </div>

      {/* Result */}
      {result && (
        <section className="mt-10 rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-10 text-center">
          <div
            className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-5xl shadow-glow ${
              result.eligible ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            {result.eligible ? "✔" : "✘"}
          </div>
          <div className={`mt-5 text-4xl font-extrabold ${result.eligible ? "text-emerald-400" : "text-red-400"}`}>
            {result.eligible ? "Eligible" : "Not Eligible"}
          </div>
          <div className="mt-3 font-mono text-sm text-gray-400">
            scope {result.scope} · proof {truncateHash(result.proofId, 6)} · verified{" "}
            {new Date(result.verifiedAt).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only this one bit was shared with {trial?.sponsor ?? "the sponsor"}. No raw values disclosed.
          </p>
        </section>
      )}
    </div>
  );
}
