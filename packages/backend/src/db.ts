// SPDX-License-Identifier: Apache-2.0
//
// SQLite persistence for the OCC's verification log.
//
// Survives backend restarts + laptop reboots. Single table, no migrations,
// no ORM — better-sqlite3 sync API keeps the handler code trivial.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const currentDir = path.resolve(fileURLToPath(import.meta.url), "..");
const dataDir = path.resolve(currentDir, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "occ.sqlite");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    patientPseudonym   TEXT    NOT NULL,
    eligible           INTEGER NOT NULL,
    scope              TEXT    NOT NULL,
    verifiedAt         TEXT    NOT NULL,
    note               TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_verifications_verifiedAt
    ON verifications(verifiedAt DESC);
`);

export interface VerificationEntry {
  patientPseudonym: string;
  eligible: boolean;
  scope: string;
  verifiedAt: string;
  note: string;
}

const insertStmt = db.prepare<[string, number, string, string, string]>(`
  INSERT INTO verifications (patientPseudonym, eligible, scope, verifiedAt, note)
  VALUES (?, ?, ?, ?, ?)
`);

const listStmt = db.prepare(`
  SELECT patientPseudonym, eligible, scope, verifiedAt, note
  FROM verifications
  ORDER BY verifiedAt DESC
  LIMIT 200
`);

export function addVerification(v: VerificationEntry): void {
  insertStmt.run(v.patientPseudonym, v.eligible ? 1 : 0, v.scope, v.verifiedAt, v.note);
}

interface VerificationRow {
  patientPseudonym: string;
  eligible: number;
  scope: string;
  verifiedAt: string;
  note: string;
}

export function listVerifications(): VerificationEntry[] {
  const rows = listStmt.all() as VerificationRow[];
  return rows.map((r) => ({
    patientPseudonym: r.patientPseudonym,
    eligible: Boolean(r.eligible),
    scope: r.scope,
    verifiedAt: r.verifiedAt,
    note: r.note,
  }));
}

console.log(`[occ:db] SQLite ready at ${dbPath}`);
