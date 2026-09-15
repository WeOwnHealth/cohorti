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
//   PRIVATE_STATE_PASSWORD  default dev-only constant (demo credential)
//   LOG_LEVEL          pino level, default info
//
// Run:  yarn deploy:preprod   (or: node --experimental-strip-types scripts/preprod-deploy.ts)

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

import { ledger, type Ledger } from '../src/managed/health-claim-gate/contract/index.js';
import * as CompiledHealthClaimGate from '../src/managed/health-claim-gate/contract/index.js';
import * as Witnesses from '../src/witnesses.ts';

import { createLogger } from './logger.ts';
import {
  generateDust,
  MidnightWalletProvider,
  randomBytes,
  syncWallet,
  waitForUnshieldedFunds,
} from './wallet.ts';

// globalThis.WebSocket: graphql-ws transport needed by the indexer provider in Node.
import { WebSocket } from 'ws';
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

const PREPROD_ENV_BASE = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
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
  await syncWallet(logger, walletProvider.wallet);

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
    const minted = await generateDust(logger, seedForDust, unshielded, walletProvider.wallet);
    if (minted) {
      await syncWallet(logger, walletProvider.wallet);
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
  const deployed = await deployContract(providers, {
    compiledContract: compiledHealthClaimGate,
    privateStateId,
    initialPrivateState: Witnesses.createHealthClaimGatePrivateState({
      patientSecretKey: randomBytes(32),
    }),
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  logger.info(`HEALTH_CLAIM_GATE_DEPLOYED address=${contractAddress}`);

  // Cross-check via the indexer that the ledger shows the contract.
  assertIsContractAddress(contractAddress);
  await sleep(3_000);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState === null) {
    logger.warn('Deploy tx confirmed, but indexer has not indexed the contract yet — check again in ~10s.');
  } else {
    const l: Ledger = ledger(contractState.data);
    logger.info(
      `Ledger state: authorizedIssuer=${toHex(l.authorizedIssuer)} · trial.active=${l.trial.active} · circuit.credentials=${l.credentials.size()}`,
    );
  }

  await walletProvider.stop();
  logger.info('Done.');
};

main().catch(async (e) => {
  console.error('preprod-deploy failed:', (e as { message?: string }).message ?? String(e));
  process.exit(1);
});
