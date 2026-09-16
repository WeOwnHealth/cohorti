"use client";

import { useEffect, useState } from "react";
import {
  API_URL,
  getTrial,
  getVerifications,
  type Trial,
  type Verification,
} from "../../lib/api";

export default function SponsorView() {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [results, setResults] = useState<Verification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrial()
      .then((t) => {
        setTrial(t);
        setError(null);
      })
      .catch(() => setError(`Cannot reach OCC at ${API_URL} — is the backend running?`));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getVerifications()
        .then((r) => {
          if (!cancelled) setResults(r.verifications);
        })
        .catch(() => {
          /* silently ignore — trial-load already surfaces backend errors */
        });
    load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Trial Sponsor Console</h1>
      <p className="mt-1 text-sm text-gray-400">
        You receive one bit per patient: eligible or not. Raw lab values never leave the patient's wallet.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Active Trial */}
      <section className="mt-8 rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6">
        <h2 className="text-lg font-semibold">Active Trial</h2>
        {trial ? (
          <div className="mt-3 grid gap-4 rounded-lg border border-midnight-surface bg-midnight-bg p-4 sm:grid-cols-2">
            <div className="text-sm">
              <div className="text-xs text-gray-500">trial</div>
              <div className="font-medium text-white">{trial.name}</div>
              <div className="text-xs text-gray-500">{trial.trialId}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-gray-500">sponsor</div>
              <div className="text-white">{trial.sponsor}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-gray-500">criteria</div>
              <div className="font-mono text-midnight-accent">
                {trial.criteria.marker} {trial.criteria.operator} {trial.criteria.threshold} {trial.criteria.unit}
              </div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-gray-500">status</div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                {trial.status}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Loading active trial…</p>
        )}
      </section>

      {/* Verification Results */}
      <section className="mt-6 rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6">
        <h2 className="text-lg font-semibold">Verification Results</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-midnight-surface text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Patient pseudonym</th>
                <th className="px-4 py-2.5">Eligibility</th>
                <th className="px-4 py-2.5">Scope</th>
                <th className="px-4 py-2.5">Verified at</th>
                <th className="px-4 py-2.5">Note</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-midnight-surface/50">
                  <td className="px-4 py-3 font-mono text-gray-300">{r.patientPseudonym}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        r.eligible ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {r.eligible ? "✔" : "✘"}
                    </span>
                    <span className={`ml-2 ${r.eligible ? "text-emerald-300" : "text-red-300"}`}>
                      {r.eligible ? "eligible" : "not eligible"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.scope}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {new Date(r.verifiedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-6 rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6">
        <h2 className="text-lg font-semibold">How It Works</h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-midnight-accent">1.</span>
            <span>Patient proves eligibility via zero-knowledge proof</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-midnight-accent">2.</span>
            <span>You see only: eligible or not eligible</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-midnight-accent">3.</span>
            <span>Raw lab values never leave the patient's wallet</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
