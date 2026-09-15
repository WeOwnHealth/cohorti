// SPDX-License-Identifier: Apache-2.0
//
// Deploy HealthClaimGate to the Midnight PREPROD network and print the
// contract address. Canonical provider pattern per midnightntwrk/example-bboard
// (YYYY-MM-DD), adapted to the judged WeOwnHealth/trials contract.
//
// Prereqs:
//   - A funded preprod wallet. Either:
//       a) WALLET_SEED=<64-hex> — seed of an existing wallet (Lace "reveal
//          recovery phrase" -> BIP-39 -> 32-byte seed, hex-encoded), or a fresh
//          hex seed you then fund from the faucet.
//       b) no WALLET_SEED — a random wallet is created and its seed + unshielded
//          address are printed; fund that address, then re-run WITH the seed.
//   - Unshielded tNIGHT of ~5,000 (one preprod faucet drip ≈ 2 deploys + demo txs).
//   - tDUST for fees: minted automatically from unshielded tNIGHT (GENERATE_DUST=1,
//     default) or manually in Lace: Tokens -> Generate tDUST.
//
// Env vars (all optional unless noted):
//   WALLET_SEED        64-hex wallet seed (or random wallet is created)
//   PROOF_SERVER_URL   default https://proof-server.preprod.midnight.network
//   GENERATE_DUST      1|0, default 1 — mint dust from unshielded tNIGHT
//   WAIT_FUNDS         1|0, default 0 — wait for faucet funds before deploying
//   SYNC_STRICT        1|0, default 0 — force full shielded+dust+unshielded replay
//                      before deploy (not needed: deploy pays from unshielded +
//                      freshly minted dust; strict sync costs hours on a fresh wallet)
//   PRIVATE_STATE_PASSWORD  default dev-only constant (demo credential)
//   LOG_LEVEL          pino level, default info
//
// Run:  yarn deploy:preprod   (or: node --experimental-strip-types scripts/preprod-deploy.ts)

import { createUnprovenDeployTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

import { ledger, type Ledger } from '../src/managed/health-claim-gate/contract/index.js';
import * as CompiledHealthClaimGate from '../src/managed/health-claim-gate/contract/index.js';
import * as Witnesses from '../src/witnesses.ts';

import { createLogger } from './logger.ts';
import {
  deregisterDust,
  generateDust,
  MidnightWalletProvider,
  randomBytes,
  syncWalletDeploy,
  waitForDustCoins,
  waitForUnregisteredUtxo,
  waitForUnshieldedFunds,
} from './wallet.ts';
import { submitRaw } from './raw-submission.ts';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';

// globalThis.WebSocket: graphql-ws transport needed by the indexer provider in Node.
import { WebSocket } from 'ws';
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
// Raw JSON-RPC frame logger (diagnostics): set before the wallet connects.
import { appendFileSync } from 'node:fs';
(globalThis as { __wslog?: unknown }).__wslog = (line: string) => {
  try { appendFileSync('/tmp/wsrpc.log', line + '\n'); } catch {}
};

const PREPROD_ENV_BASE = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS:
    process.env.NODE_WS_URL ?? 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
} as const;

const env = (): EnvironmentConfiguration =>
  ({
    ...PREPROD_ENV_BASE,
    proofServer: process.env.PROOF_SERVER_URL ?? 'https://proof-server.preprod.midnight.network',
  }) as EnvironmentConfiguration;

const ZK_CONFIG_PATH = new URL('../src/managed/health-claim-gate', import.meta.url).pathname;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const main = async (): Promise<void> => {
  setNetworkId('preprod');
  const config = env();
  const logger = createLogger();

  const seed = process.env.WALLET_SEED;
  if (seed && !/^[0-9a-fA-F]{64}$/.test(seed)) {
    throw new Error('WALLET_SEED must be exactly 64 hex chars (32-byte seed).');
  }

  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);
  await walletProvider.start();
  // Raw submission wiring (see raw-submission.ts): preprod's node closes the WS
  // on polkadot-js's watch-submit path, so every facade submission is routed to
  // a bare one-shot `author_submitExtrinsic` instead.
  const facadeWallet = walletProvider.wallet as WalletFacade & { submitTransaction: (tx: unknown) => Promise<string> };
  const nodeWsUrl = config.nodeWS;
  const rawSubmitWrapper = async (tx: unknown): Promise<string> => submitRaw(tx as Parameters<typeof submitRaw>[0], nodeWsUrl);
  facadeWallet.submitTransaction = rawSubmitWrapper;
  // Relaxed gate (SYNC_STRICT=1 to force the full strict sync): unshielded caught
  // up + dust live at tip — see wallet.ts syncWalletDeploy. A fresh wallet must
  // NOT replay preprod's ~1.5M-event dust ledger to deploy.
  await syncWalletDeploy(logger, walletProvider.wallet);

  const waitFunds = process.env.WAIT_FUNDS === '1';
  const unshielded = await waitForUnshieldedFunds(logger, walletProvider.wallet, config, waitFunds);
  const balance = unshielded.balances[unshieldedToken().raw] ?? 0n;
  logger.info(`Unshielded tNIGHT balance: ${balance}`);

  if (balance === 0n) {
    logger.info(
      'No funds — deploy aborted. Fund this address from ' +
        config.faucet +
        ' (one drip ~= 5,000 tNIGHT), then re-run with WALLET_SEED=<that seed>.',
    );
    await walletProvider.stop();
    process.exit(2);
  }

  if (process.env.GENERATE_DUST !== '0') {
    const seedForDust = seed ?? '';
    // A prior run's mint may already be on-chain (UTXOs registered for dust
    // generation). A fresh CLI wallet sees no tDUST from earlier processes, so
    // deregister first, then mint in-process so the fee coins arrive via the
    // wallet's live dust subscription.
    await deregisterDust(logger, seedForDust, unshielded, walletProvider.wallet);
    await waitForUnregisteredUtxo(logger, walletProvider.wallet);
    const freshState = await Rx.firstValueFrom(walletProvider.wallet.unshielded.state);
    const minted = await generateDust(logger, seedForDust, freshState, walletProvider.wallet);
    if (minted) {
      // Give the dust wallet's live subscription a moment to absorb the minted
      // tDUST (fees are paid from it) — no full replay needed.
      await waitForDustCoins(walletProvider.wallet);
    }
  }

  const zkConfigProvider = new NodeZkConfigProvider<'issueCredential' | 'proveClaim'>(ZK_CONFIG_PATH);
  const compiledHealthClaimGate = CompiledContract.make<
    CompiledHealthClaimGate.Contract<Witnesses.HealthClaimGatePrivateState>
  >('HealthClaimGate', CompiledHealthClaimGate.Contract<Witnesses.HealthClaimGatePrivateState>).pipe(
    CompiledContract.withWitnesses(Witnesses.witnesses),
    CompiledContract.withCompiledFileAssets(ZK_CONFIG_PATH),
  );

  type HealthClaimGateContract = CompiledHealthClaimGate.Contract<Witnesses.HealthClaimGatePrivateState>;
  type HealthClaimGateCircuitKeys = Exclude<keyof HealthClaimGateContract['impureCircuits'], number | symbol>;
  const privateStateId = 'health-claim-gate';
  type HealthClaimGateProviders = MidnightProviders<
    HealthClaimGateCircuitKeys,
    typeof privateStateId,
    Witnesses.HealthClaimGatePrivateState
  >;

  const providers: HealthClaimGateProviders = {
    privateStateProvider: levelPrivateStateProvider<
      typeof privateStateId,
      Witnesses.HealthClaimGatePrivateState
    >({
      privateStateStoreName: 'health-claim-gate-private-state',
      signingKeyStoreName: 'health-claim-gate-private-state-signing-keys',
      privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD ?? 'HealthClaimGate-Demo-2026!',
      accountId: seed ?? 'ephemeral-deploy-wallet',
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  logger.info('Deploying HealthClaimGate to preprod...');
  // Build the deploy tx ourselves: deployContract's internal submission watch
  // (watchForTxData on the SDK-returned tx id) cannot resolve the hash form the
  // relay returns for a bare submission (wire-proven mismatch 2026-09-15), so we
  // submit async and wait for the CONTRACT to appear on the indexer instead.
  const unproven = await createUnprovenDeployTx<HealthClaimGateContract>(providers, {
    compiledContract: compiledHealthClaimGate,
    signingKey: sampleSigningKey(),
    initialPrivateState: Witnesses.createHealthClaimGatePrivateState({
      patientSecretKey: randomBytes(32),
    }),
  });
  const contractAddress = unproven.public.contractAddress;
  assertIsContractAddress(contractAddress);
  logger.info(`Deploy tx prepared, contract address = ${contractAddress}`);
  const txId = await submitTxAsync(providers, { unprovenTx: unproven.private.unprovenTx });
  logger.info(`Deploy tx submitted: ${txId}`);

  // Inclusion wait on the contract itself (the deploy tx's own success signal).
  const deadline = Date.now() + 240_000;
  let contractState = null;
  while (Date.now() < deadline && contractState === null) {
    await sleep(5_000);
    contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  }
  if (contractState === null) {
    logger.warn('Deploy tx submitted, but the indexer has not shown the contract yet — check again in ~10s.');
  } else {
    const l: Ledger = ledger(contractState.data);
    logger.info(
      `Ledger state: authorizedIssuer=${toHex(l.authorizedIssuer)} · trial.active=${l.trial.active} · circuit.credentials=${l.credentials.size()}`,
    );
    // Mirror submitDeployTx's post-submit private-state bookkeeping.
    providers.privateStateProvider.setContractAddress(contractAddress);
    await providers.privateStateProvider.set(privateStateId, unproven.private.initialPrivateState);
    await providers.privateStateProvider.setSigningKey(contractAddress, unproven.private.signingKey);
    logger.info(`HEALTH_CLAIM_GATE_DEPLOYED address=${contractAddress}`);
  }

  await walletProvider.stop();
  logger.info('Done.');
};

main().catch(async (e) => {
  let err: unknown = e;
  let depth = 0;
  while (err && depth < 6) {
    const msg = (err as { message?: string }).message ?? String(err);
    console.error(`deploy failed (depth ${depth}): ${msg}`);
    const cause = (err as { cause?: unknown }).cause;
    if (cause === undefined || cause === err) break;
    err = cause;
    depth++;
  }
  process.exit(1);
});
