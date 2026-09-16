// SPDX-License-Identifier: Apache-2.0
//
// Midnight standalone integration for the OCC backend.
//
// On boot:
//   1. Build the genesis-funded wallet against the local Midnight standalone
//      stack (docker compose up in packages/contract/standalone).
//   2. Register the funding UTXO for dust generation + wait for accrual.
//   3. Wire the providers (indexer + proof-server + private-state) and deploy
//      the HealthClaimGate contract.
//   4. Cache { deployed, providers, wallet } for endpoint handlers to use.
//
// Endpoints then call the REAL contract for issue-credential and verify-proof.
// tx hashes / commitments returned to the frontend are live on-chain values.

import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import * as ledgerSdk from '@midnight-ntwrk/ledger-v8';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
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
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';

// Contract package
import {
  Contract,
  ledger,
  pureCircuits,
} from '@weownhealth/trials-contract/src/managed/health-claim-gate/contract/index.js';
import {
  createHealthClaimGatePrivateState,
  witnesses,
  type HealthClaimGatePrivateState,
} from '@weownhealth/trials-contract/src/witnesses.ts';

// @ts-expect-error node global
globalThis.WebSocket = WebSocket;

setNetworkId('undeployed');

// Endpoints are env-driven so the same code runs locally (127.0.0.1) and on
// the droplet (docker-compose service names on the trialsnet bridge).
const config = {
  indexer: process.env.MIDNIGHT_INDEXER_HTTP ?? 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: process.env.MIDNIGHT_INDEXER_WS ?? 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: process.env.MIDNIGHT_NODE_HTTP ?? 'http://127.0.0.1:9944',
  proofServer: process.env.MIDNIGHT_PROOF_SERVER ?? 'http://127.0.0.1:6300',
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const PRIVATE_STATE_ID = 'hcgPrivateState';

const log = (msg: string): void => console.log(`[occ:midnight] ${msg}`);

const deriveKeysFromSeed = (seed: string): Record<string, Uint8Array> => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if ((hdWallet as unknown as { type: string }).type !== 'seedOk') throw new Error('bad seed');
  const inner = (hdWallet as unknown as { hdWallet: { selectAccount(n: number): unknown; clear(): void } }).hdWallet;
  const derived = (inner.selectAccount(0) as unknown as { selectRoles(r: unknown[]): { deriveKeysAt(i: number): { type: string; keys: Record<string, Uint8Array> } } })
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== 'keysDerived') throw new Error('key derivation failed');
  inner.clear();
  return derived.keys;
};

async function buildWallet() {
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

export interface MidnightRuntime {
  contractAddress: string;
  walletAddress: string;
  deployed: {
    deployTxData: { public: { contractAddress: string; blockHeight?: number } };
    callTx: Record<string, (...args: unknown[]) => Promise<{ public: { txId: string; blockHeight?: number }; private: { result: unknown } }>>;
  };
  providers: {
    privateStateProvider: unknown;
    publicDataProvider: {
      queryContractState: (address: string) => Promise<{ data: unknown } | null>;
    };
  };
  pureCircuits: typeof pureCircuits;
  ledger: typeof ledger;
}

let runtime: MidnightRuntime | null = null;

export async function initMidnight(): Promise<MidnightRuntime> {
  if (runtime) return runtime;
  log(`initializing against local standalone: ${config.node}`);
  const ctx = await buildWallet();
  await registerForDust(ctx);

  const state = await Rx.firstValueFrom(
    (ctx.wallet as unknown as { state: () => Rx.Observable<{ isSynced: boolean; shielded: { coinPublicKey: { toHexString: () => string }; encryptionPublicKey: { toHexString: () => string } }; unshielded: { address: unknown } }> }).state().pipe(
      Rx.filter((s) => s.isSynced),
    ),
  );
  // Encode the unshielded address into its canonical bech32m form.
  let walletAddress = 'unknown';
  try {
    const encoded = (UnshieldedAddress as unknown as {
      codec: { encode: (networkId: string, addr: unknown) => { asString: () => string } };
    }).codec.encode(getNetworkId(), state.unshielded.address);
    walletAddress = encoded.asString();
  } catch (e) {
    log(`wallet address encode failed: ${(e as { message?: string }).message ?? String(e)}`);
  }
  log(`wallet address: ${walletAddress}`);

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
  };

  const currentDir = path.resolve(fileURLToPath(import.meta.url), '..');
  // packages/backend/src/midnight.ts → ../../contract/src/managed/health-claim-gate
  const zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'health-claim-gate');
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'hcg-backend-private-state',
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

  log('deploying HealthClaimGate to standalone...');
  // Demo issuer secret: right-pad "hcg:demo:issuer-sk" to 32 bytes with zeros
  // (matches the contract constructor's pad(32, "hcg:demo:issuer-sk")).
  const demoIssuerSecret = new Uint8Array(32);
  demoIssuerSecret.set(new TextEncoder().encode('hcg:demo:issuer-sk'), 0);
  const initialPrivateState: HealthClaimGatePrivateState = createHealthClaimGatePrivateState({
    patientSecretKey: randomBytes(32),
    issuerSecretKey: demoIssuerSecret,
  });
  const deployed = await (deployContract as unknown as (p: unknown, opts: unknown) => Promise<{
    deployTxData: { public: { contractAddress: string; blockHeight?: number } };
    callTx: Record<string, (...args: unknown[]) => Promise<{ public: { txId: string; blockHeight?: number }; private: { result: unknown } }>>;
  }>)(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState,
  });
  const contractAddress = deployed.deployTxData.public.contractAddress;
  log(`✅ HealthClaimGate deployed at ${contractAddress}`);

  runtime = {
    contractAddress,
    walletAddress,
    deployed,
    providers: providers as unknown as MidnightRuntime['providers'],
    pureCircuits,
    ledger,
  };
  return runtime;
}
