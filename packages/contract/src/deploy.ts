// This file is part of WeOwnHealth/trials.
// SPDX-License-Identifier: Apache-2.0
//
// dApp-connector wiring for HealthClaimGate (canonical pattern per
// midnightntwrk/example-bboard). NOT part of this Wave-1 CI path.
//
// Resolved 2026-09-15: the connector imports now install cleanly
// (protocol@4.1.1 → compact-js@2.5.1 → ledger-v8; the yanked ledger-v9 alpha
// only bites compact-js@2.5.2/2.5.3 — pinned away, see CONTRACT_GOTCHAS.md
// §Deploy). `midnight-js-protocol@4.1.1` is a dependency; un-exclude this file
// from tsconfig.json when you want it in the CI typecheck. The live deploy
// flow lives in scripts/preprod-deploy.ts (yarn deploy:preprod).

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/health-claim-gate/contract/index.js";
export * from "./witnesses";

import * as CompiledHealthClaimGate from "./managed/health-claim-gate/contract/index.js";
import * as Witnesses from "./witnesses.js";

export const CompiledHealthClaimGateContract = CompiledContract.make<
  CompiledHealthClaimGate.Contract<Witnesses.HealthClaimGatePrivateState>
>(
  "HealthClaimGate",
  CompiledHealthClaimGate.Contract<Witnesses.HealthClaimGatePrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./src/managed/health-claim-gate"),
);
