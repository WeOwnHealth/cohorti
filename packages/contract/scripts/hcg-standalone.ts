// SPDX-License-Identifier: Apache-2.0
//
// HealthClaimGate deploy against LOCAL Midnight standalone stack.
//
// Uses WalletFacade-direct pattern (bypass FluentWalletBuilder DustParameters
// bug). Genesis-funded dev seed, no faucet needed. Prereq:
//   docker compose -f standalone/docker-compose.yml up -d
//
// Run: node --experimental-strip-types scripts/hcg-standalone.ts

import { Buffer } from 'node:buffer';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import * as ledgerSdk from '@midnight-ntwrk/ledger-v8';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { Contract, ledger } from '../src/managed/health-claim-gate/contract/index.js';
import { createHealthClaimGatePrivateState, witnesses } from '../src/witnesses.ts';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// GraphQL subscriptions (wallet sync) need a global WebSocket in Node
// @ts-expect-error node global
globalThis.WebSocket = WebSocket;

setNetworkId('undeployed');

const config = {
  indexer: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: 'http://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const PRIVATE_STATE_ID = 'hcgPrivateState';

const log = (msg: string): void => console.log(`[hcg] ${msg}`);
const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex');

const deriveKeysFromSeed = (seed: string): Record<string, Uint8Array> => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if ((hdWallet as unknown as { type: string }).type !== 'seedOk') throw new Error('bad seed');
  const res = (hdWallet as unknown as { hdWallet: { selectAccount(n: number): unknown; clear(): void } }).hdWallet
    .selectAccount(0);
  const derived = (res as unknown as { selectRoles(r: unknown[]): { deriveKeysAt(i: number): { type: string; keys: Record<string, Uint8Array> } } })
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== 'keysDerived') throw new Error('key derivation failed');
  (hdWallet as unknown as { hdWallet: { clear(): void } }).hdWallet.clear();
  return derived.keys;
};

async function buildWallet(): Promise<{
  wallet: WalletFacade;
  shieldedSecretKeys: unknown;
  dustSecretKey: unknown;
  unshieldedKeystore: UnshieldedKeystore;
}> {
  const keys = deriveKeysFromSeed(GENESIS_MINT_WALLET_SEED);
  const shieldedSecretKeys = (ledgerSdk as unknown as { ZswapSecretKeys: { fromSeed: (b: Uint8Array) => unknown } }).ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = (ledgerSdk as unknown as { DustSecretKey: { fromSeed: (b: Uint8Array) => unknown } }).DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const walletConfig = {
    networkId: getNetworkId(),
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };
  const dustParams = (ledgerSdk as unknown as { LedgerParameters: { initialParameters(): { dust: unknown } } }).LedgerParameters.initialParameters().dust;
  const wallet = await (WalletFacade as unknown as { init: (opts: unknown) => Promise<WalletFacade> }).init({
    configuration: walletConfig,
    shielded: (cfg: unknown) => (ShieldedWallet as unknown as (c: unknown) => { startWithSecretKeys: (s: unknown) => unknown })(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg: unknown) => (UnshieldedWallet as unknown as (c: unknown) => { startWithPublicKey: (p: unknown) => unknown })(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg: unknown) => (DustWallet as unknown as (c: unknown) => { startWithSecretKey: (s: unknown, p: unknown) => unknown })(cfg).startWithSecretKey(dustSecretKey, dustParams),
  });
  await (wallet as unknown as { start: (s: unknown, d: unknown) => Promise<void> }).start(shieldedSecretKeys, dustSecretKey);

  log('syncing wallet with local network...');
  const synced = await Rx.firstValueFrom(
    (wallet as unknown as { state: () => Rx.Observable<{ isSynced: boolean; unshielded: { balances: Record<string, bigint> } }> }).state().pipe(
      Rx.filter((s) => s.isSynced),
    ),
  );
  const balance = synced.unshielded.balances[unshieldedToken().raw] ?? 0n;
  log(`wallet synced — unshielded balance: ${balance.toLocaleString()} tNIGHT`);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

async function registerForDust(ctx: {
  wallet: WalletFacade;
  unshieldedKeystore: UnshieldedKeystore;
}): Promise<void> {
  const state = await Rx.firstValueFrom(
    (ctx.wallet as unknown as { state: () => Rx.Observable<{ isSynced: boolean; unshielded: { availableCoins: Array<{ meta?: { registeredForDustGeneration?: boolean } }> }; dust: { availableCoins: unknown[]; balance: (d: Date) => bigint } }> }).state().pipe(
      Rx.filter((s) => s.isSynced),
    ),
  );
  if (state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n) {
    log(`dust ready: ${state.dust.balance(new Date()).toLocaleString()}`);
    return;
  }
  const utxos = state.unshielded.availableCoins.filter((c) => c.meta?.registeredForDustGeneration !== true);
  if (utxos.length > 0) {
    log(`registering ${utxos.length} NIGHT UTXO(s) for dust generation...`);
    const walletApi = ctx.wallet as unknown as {
      registerNightUtxosForDustGeneration: (u: unknown, pk: unknown, sig: (p: Uint8Array) => unknown) => Promise<unknown>;
      finalizeRecipe: (r: unknown) => Promise<unknown>;
      submitTransaction: (t: unknown) => Promise<string>;
    };
    const recipe = await walletApi.registerNightUtxosForDustGeneration(
      utxos,
      ctx.unshieldedKeystore.getPublicKey(),
      (payload) => ctx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletApi.finalizeRecipe(recipe);
    await walletApi.submitTransaction(finalized);
  }
  log('waiting for dust to accrue...');
  await Rx.firstValueFrom(
    (ctx.wallet as unknown as { state: () => Rx.Observable<{ isSynced: boolean; dust: { balance: (d: Date) => bigint } }> }).state().pipe(
      Rx.throttleTime(3_000),
      Rx.filter((s) => s.isSynced && s.dust.balance(new Date()) > 0n),
    ),
  );
  log('dust available');
}

async function main(): Promise<void> {
  log(`network: ${getNetworkId()} — node ${config.node}`);
  const ctx = await buildWallet();
  await registerForDust(ctx);

  const state = await Rx.firstValueFrom(
    (ctx.wallet as unknown as { state: () => Rx.Observable<{ isSynced: boolean; shielded: { coinPublicKey: { toHexString: () => string }; encryptionPublicKey: { toHexString: () => string } } }> }).state().pipe(
      Rx.filter((s) => s.isSynced),
    ),
  );

  const walletAndMidnightProvider = {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: unknown, ttl?: Date): Promise<unknown> {
      const walletApi = ctx.wallet as unknown as {
        balanceUnboundTransaction: (tx: unknown, keys: unknown, opts: unknown) => Promise<unknown>;
        finalizeRecipe: (r: unknown) => Promise<unknown>;
      };
      const recipe = await walletApi.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletApi.finalizeRecipe(recipe);
    },
    submitTx: (tx: unknown): Promise<string> =>
      (ctx.wallet as unknown as { submitTransaction: (t: unknown) => Promise<string> }).submitTransaction(tx),
  } as unknown as WalletProvider & MidnightProvider;

  const currentDir = path.resolve(fileURLToPath(import.meta.url), '..');
  const zkConfigPath = path.resolve(currentDir, '..', 'src', 'managed', 'health-claim-gate');
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'hcg-private-state',
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  } as unknown as Parameters<typeof deployContract>[0];

  const compiledContract = (CompiledContract as unknown as { make: (name: string, c: unknown) => { pipe: (...fns: unknown[]) => unknown } })
    .make('HealthClaimGate', Contract)
    // @ts-expect-error dynamic pipe
    .pipe(
      (CompiledContract as unknown as { withWitnesses: (w: unknown) => unknown }).withWitnesses(witnesses),
      (CompiledContract as unknown as { withCompiledFileAssets: (p: string) => unknown }).withCompiledFileAssets(zkConfigPath),
    );

  log('deploying HealthClaimGate...');
  const initialPrivateState = createHealthClaimGatePrivateState({
    patientSecretKey: randomBytes(32),
  });
  const deployed = await (deployContract as unknown as (p: unknown, opts: unknown) => Promise<{ deployTxData: { public: { contractAddress: string } } }>)(
    providers,
    {
      compiledContract,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState,
    },
  );
  const contractAddress = deployed.deployTxData.public.contractAddress;
  log(`✅ CONTRACT DEPLOYED: ${contractAddress}`);
  log(`explorer: n/a (local standalone network)`);
  console.log(`\n\n===HEALTH_CLAIM_GATE_DEPLOYED===`);
  console.log(`address=${contractAddress}`);
  console.log(`network=undeployed (local standalone)`);
  console.log(`===============================\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error('---HCG DEPLOY FAILED---');
  console.error(e);
  console.error((e as { stack?: string }).stack);
  process.exit(1);
});
