# CONTRACT_GOTCHAS.md — compactc · Midnight SDK · Lace

Hard-won pitfalls for the WeOwnHealth/trials Wave-1 contract. Update this file
whenever a new one costs you time.

## compactc (the compiler)

1. **`compactc` is NOT the npm `compact` package** — `/@midnight-ntwrk/compact` does not exist on npm (E404). The binary is fetched from the `midnightntwrk/compact` GitHub release assets (`compactc_v<version>_<os>-<cpu>.zip`) by `@midnight-ntwrk/midnight-js-compact`:
   `yarn fetch:compact` → `node …/fetch-compact.mjs --version=0.31.1` (note the `--version=` equals form; `--version foo` silently fails).
2. **CLI is positional, not subcommand**: `compactc [flags] <source.compact> <target-dir>` — target dir gets `contract/` + `zkir/` + `compiler/contract-info.json`. There is no `compact compile` subcommand (older wrappers hid this).
3. **Pin everything — compiler emits its pins**: `--version` 0.31.1 · `--language-version` 0.23.0 · `--runtime-version` 0.16.0 · `--ledger-version` ledger-8.0.2. The generated `contract/index.js` targets `@midnight-ntwrk/compact-runtime@0.16.0` — do NOT let npm float that to 0.19.0.
4. **Compact is its own language, not "TypeScript-flavored"** — `pragma language_version 0.23;` · `import CompactStandardLibrary;` · `export ledger …` · `witness name(): T;` · `assert(cond, "msg")` · `disclose(x)`. Types: `Bytes<32>`, `Uint<16|64>`, `Field`, `Boolean`, `Maybe<T>` (`none<T>()`/`some<T>(x)`), `Map<K,V>`, `Counter`, `Opaque<"…">`. No floats — ever.
5. **Trailing commas are banned in parameter lists & call args** (struct *field* lists allow them — inconsistent, parse differently).
6. **Witness-value disclosure gate**: any value derived from a circuit parameter or witness that reaches a ledger operation (Map key, insert args…) MUST be wrapped in `disclose(...)` (e.g. `credentials.insert(disclose(patient), …)`). The phrase is "potential witness-value disclosure must be declared".
7. **Map API** (ledger Maps): `insert(k,v)`, `lookup(k)` (returns default when absent — always `member(k)`-gate reads), `member(k)`, `remove(k)`, `size()`, `isEmpty()`, `insertDefault(k)`, `resetToDefault()`. There is no `get`/`contains`.
8. **`--skip-zk`** is your 1-second compile feedback; it still writes `zkir/*.zkir`. Full compile (`compact:zk`) generates proving keys — only needed for deploy/demo.
9. **`pad(32, "ascii")` right-pads with zeros** — reproduce in TS as a 32-byte array (see `bytes32()` in the tests) if you re-derive keys outside the circuit.
10. **Tests**: `yarn test` runs **vitest** — jest 29 was dropped because its VM cannot host the wasm-based `compact-runtime`/`onchain-runtime-v3` (SyntaxError on ESM exports across many configs). Plain Node ESM + vitest (official `example-bboard` stack) loads it fine. Configure vitest `globals: true` for jest-style `describe/it/expect`.

## Midnight SDK / runtime

1. **The official VC framework exists — import, don't reinvent**: `@midnight-ntwrk/credential-compact` v0.1.0-rc3 (Apache-2.0, `midnightntwrk/midnight-verifiable-credentials`) ships compiled `vc/vp/proofs` modules. This Wave-1 first pass deliberately keeps a self-contained 2-circuit contract; folding in the framework for full issuer-signature verification is the natural Wave-2 move (its `pragma language_version >= 0.20` compiles with 0.30.x+).
2. **Harness pattern** (no testnet): `Contract` + `createConstructorContext` + `QueryContext` + `CostModel` from `@midnight-ntwrk/compact-runtime`, driven by `contract.impureCircuits.<circuit>(ctx, …)` — see `src/test/harness.ts` (pattern: official `midnightntwrk/example-bboard`).
3. **Constructor args unsupported risk**: `createConstructorContext(privateState, address)` carries no constructor-parameter channel in 0.16.0 — hence the no-arg constructor with documented demo defaults. Configurable issuer/trial = Wave-2 circuits (`registerIssuer`, `createTrial`).
4. **Witnesses map**: private values are `WitnessContext`-keyed functions returning `[newPrivateState, value]` — every `witness` in the compact needs exactly one entry in `witnesses` or the Contract constructor throws.
5. **`now` is caller-supplied in Wave 1** — expiry is consent-relative, enforced in-circuit. A chain-time (`TimeProvider`) fold is Wave-2; say so in demos/README instead of over-claiming.
6. **Commitment salt is mandatory** — biomarker values are low-entropy; an unblinded commitment is dictionary-attackable. `persistentHash<CommitmentPreimage>(…)` keeps the preimage private.

## Lace (Midnight wallet extension)

1. Wallet-pull delivery = the patient opens Lace and *pulls* pending requests — do not build push infra in Wave 1.
2. Preprod faucet: `https://faucet.preprod.midnight.network/` — ~1000 units/drip, Turnstile (human-only, no scripted drips), rate-limited per address. One drip ≈ 2 circuit deploys + demo txs.
3. Demo determinism: the video is the primary artifact; add a seeded replay mode so the verifier UI runs with no testnet dependency (unit harness above already does this).
4. Lace connect from the UI: `window.midnight.<walletId>.connect()` (`@midnight-ntwrk/dapp-connector-api` v4.0.1) — pin the SDK version in the UI package; the generated contract must match the runtime the wallet provider uses.

## Deploy (preprod) — hard-won 2026-09-15

1. **The yanked-dep trap is `compact-js@2.5.2/2.5.3`, not the ledger.** They reach
   for `@midnight-ntwrk/ledger-v9@^0.1.0-alpha.1`, which npm no longer serves (only
   `1.0.0-rc.3/.4/.5` exist; `time[0.1.0-alpha.1]` is `undefined`). Nothing in the
   verified deploy stack (midnight-js-protocol@4.1.1 → compact-js@2.5.1 → ledger-v8)
   touches it. Keep `compact-js` pinned at `2.5.1` (protocol 4.1.1's pin); do NOT
   "upgrade" it to 2.5.3+, and do NOT install `@midnight-ntwrk/ledger-v9` directly.
2. **Resolutions pin `ledger-v8` to 8.1.0** (package.json `resolutions`) — otherwise
   yarn installs a nested duplicate copy and the `FinalizedTransaction`/`ZswapSecretKeys`
   nominal types mismatch across providers.
3. **`node --experimental-strip-types` runs the deploy script** (Node ≥ 22.6); there is
   no tsx/ts-node dependency. Import local TS with explicit `.ts` extensions — Node's
   strip-types does NOT rewrite `.js` → `.ts` import specifiers.
4. **Type-only exports are erased at runtime**: import `type CoinPublicKey,
   EncPublicKey, FinalizedTransaction` etc. — importing them as values throws
   "does not provide an export named …" under strip-types.
5. **Hosted proof server**: `POST https://proof-server.preprod.midnight.network/prove`
   and `/check` answer (400 on empty payload = live). No Docker needed for proving.
6. **Preprod endpoints**: indexer `https://indexer.preprod.midnight.network/api/v4/graphql`
   (ws: same + `/ws`) · node `https://rpc.preprod.midnight.network` (wss) · faucet
   `https://midnight-tmnight-preprod.nethermind.dev/`.
7. **tDUST**: preprod tx fees are tDUST minted FROM unshielded tNIGHT
   (`registerNightUtxosForDustGeneration`), not from shielded funds. Deploy spends
   unshielded tNIGHT; no shielding required.
8. **Fresh-wallet sync stall — the real story (2026-09-15, RETRACTED my earlier
   `subscribeRuntimeVersion` theory):** the preprod relay + indexer are healthy
   end-to-end. `subscribeRuntimeVersion` `-32601` is just a non-existent bare
   method — the namespaced forms (`chain_subscribeRuntimeVersion`,
   `state_subscribeRuntimeVersion`) subscribe fine via the real @polkadot stack,
   and "RuntimeVersion disconnected … 1000 Normal Closure" is polkadot-js noise.
   The stall is the wallet SDK replaying ~1.5M shielded + ~1.5M dust events on a
   fresh wallet (dust throttled to ~150-260 ev/s ⇒ hours). Fix landed in the same
   commit: relaxed `syncWalletDeploy` gate — unshielded caught up + dust live at
   tip, dust address derived via `wallet.dust.getAddress()` (never
   `waitForSyncedState`), post-mint tDUST wait via `waitForDustCoins`.
   `SYNC_STRICT=1` restores strict replay. Verified: funding-gate checkpoint in
   ~3s on a fresh wallet (was 13+ min, no output, under strict).
