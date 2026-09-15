// SPDX-License-Identifier: Apache-2.0
//
// Framing probe (2026-09-15): does author_submitExtrinsic need the SCALE
// Vec<u8> compact-length prefix (what polkadot-js's Bytes codec sends), or the
// bare serialized extrinsic bytes? Builds the dereg tx, dumps both encodings,
// and submits each to the preprod relay. One-shot diagnostic — not part of the
// deploy lane.

import { SerializedTransaction } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { WebSocket } from 'ws';
import { appendFileSync } from 'node:fs';

import { createLogger } from './logger.ts';
import {
  MidnightWalletProvider,
  getUnshieldedSeed,
  syncWalletDeploy,
} from './wallet.ts';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';

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
  ({ ...PREPROD_ENV_BASE, proofServer: 'https://proof-server.preprod.midnight.network' }) as EnvironmentConfiguration;

/** SCALE compact encoding (matches @polkadot/util compactToU8a) for lengths < 2^30. */
const compactToU8a = (value: number): Uint8Array => {
  if (value <= 0x3f) return new Uint8Array([value << 2]);
  if (value <= 0x3fff) {
    const v = (value << 2) | 0b01;
    return new Uint8Array([v & 0xff, v >> 8]);
  }
  const v = (value << 2) | 0b10;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
};

const rawSubmit = (hex: string, nodeWsUrl: string, timeoutMs = 60_000): Promise<string> => {
  const ws = new WebSocket(nodeWsUrl);
  let answered = false;
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('probe submit timeout')), timeoutMs);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'author_submitExtrinsic', params: [hex] }));
    });
    ws.on('message', (data) => {
      const frame = JSON.parse(String(data));
      if (frame.id !== 1) return;
      answered = true;
      clearTimeout(timer);
      if (frame.error) reject(new Error(`relay: ${JSON.stringify(frame.error)}`));
      else resolve(String(frame.result));
    });
    ws.on('close', (code, reason) => {
      if (!answered) {
        clearTimeout(timer);
        reject(new Error(`closed before answer: ${code} ${reason}`));
      }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      reject(new Error('probe ws error'));
    });
  }).finally(() => {
    try { ws.close(); } catch {}
  });
};

const main = async (): Promise<void> => {
  setNetworkId('preprod');
  const config = env();
  const logger = createLogger();
  const seed = process.env.WALLET_SEED!;
  if (!/^[0-9a-fA-F]{64}$/.test(seed)) throw new Error('bad seed');

  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);
  await walletProvider.start();
  await syncWalletDeploy(logger, walletProvider.wallet);
  const unshieldedState = await Rx.firstValueFrom(walletProvider.wallet.unshielded.state);
  const networkId = getNetworkId();
  const keystore = createKeystore(getUnshieldedSeed(seed), networkId);
  const utxos = unshieldedState.availableCoins.filter((c) => c.meta.registeredForDustGeneration);
  logger.info(`registered-for-dust UTXOs: ${utxos.length}`);
  if (utxos.length === 0) {
    logger.info('nothing registered — nothing to probe; exiting 0');
    await walletProvider.stop();
    return;
  }
  const recipe = await walletProvider.wallet.deregisterFromDustGeneration(
    utxos,
    keystore.getPublicKey(),
    (payload) => keystore.signData(payload),
  );
  const tx = await walletProvider.wallet.finalizeRecipe(recipe);
  const raw = SerializedTransaction.from(tx);
  const rawHex = Buffer.from(raw).toString('hex');
  const prefixedU8a = new Uint8Array([...compactToU8a(raw.length), ...raw]);
  const prefixedHex = Buffer.from(prefixedU8a).toString('hex');
  logger.info(`serialized length: ${raw.length} bytes (raw hex ${rawHex.length} chars)`);
  logger.info(`prefixed hex ${prefixedHex.length} chars, first 24: ${prefixedHex.slice(0, 24)}`);
  appendFileSync('/tmp/framing-dump.txt', `raw_len=${raw.length}\nraw=${rawHex}\nprefixed=${prefixedHex}\n`);
  logger.info('dumping encoded bytes to /tmp/framing-dump.txt');

  // Try bare (current submitRaw behavior) and prefixed (polkadot Bytes codec).
  for (const [label, hex] of [['bare', `0x${rawHex}`], ['compact-prefixed', `0x${prefixedHex}`]] as [string, string][]) {
    try {
      const result = await rawSubmit(hex, config.nodeWS);
      logger.info(`SUBMIT ${label}: ACCEPTED ${result}`);
    } catch (e) {
      logger.warn(`SUBMIT ${label}: REJECTED: ${(e as { message?: string }).message}`);
    }
  }
  await walletProvider.stop();
  logger.info('probe done');
};

main().catch((e) => {
  const msg = (e as { message?: string }).message ?? String(e);
  console.error(`probe failed: ${msg}`);
  process.exit(1);
});
