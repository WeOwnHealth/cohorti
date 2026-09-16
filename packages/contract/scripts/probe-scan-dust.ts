// SPDX-License-Identifier: Apache-2.0
// One-shot: scan recent blocks after the designation tx for dust-ledger txs,
// decode each DustInitialUtxo raw via the ledger deserializer, and print the
// dust owner public key so we can match it against our deploy wallet's key.
// Safe to delete. Relies on WALLET_SEED in env.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
import { LedgerEvent } from '@midnight-ntwrk/ledger-v8';

import { createLogger } from './logger.ts';
import { MidnightWalletProvider } from './wallet.ts';

const PREPROD_ENV_BASE = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
} as const;

const gql = async (query: string, vars: Record<string, unknown> = {}) => {
  const res = await fetch('https://indexer.preprod.midnight.network/api/v4/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: vars }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
};

const OWNER_FIELD = 'owner';

const main = async (): Promise<void> => {
  setNetworkId('preprod');
  const config: EnvironmentConfiguration = {
    ...PREPROD_ENV_BASE,
    proofServer: process.env.PROOF_SERVER_URL ?? 'https://proof-server.preprod.midnight.network',
  } as EnvironmentConfiguration;
  const logger = createLogger();
  // Build the wallet ONLY to read our own dust public key (no sync).
  // Simpler: derive dust pubkey without starting the facade.
  const seed = process.env.WALLET_SEED;
  if (!seed) throw new Error('WALLET_SEED required');
  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);
  await walletProvider.start();
  // dust public key from the wallet (already derived; no sync needed for the key)
  const dustPub = await (walletProvider.wallet.dust as { publicKey?: () => unknown }).publicKey?.();
  console.log('OUR_DUST_PUBLIC_KEY:', dustPub ? String(dustPub) : '(not exposed; will match by replay)');
  await walletProvider.stop();

  // Find designation block height range: designated 2563798; scan forward ~120 blocks.
  const start = 2563798;
  const end = start + 120;
  console.log(`Scanning blocks ${start}..${end} for dust-ledger transactions...`);
  const found: Array<Record<string, unknown>> = [];
  for (let h = start; h <= end; h++) {
    const d = await gql(`query B($o: BlockOffset) {
      block(offset: $o) {
        height timestamp
        transactions {
          hash
          dustLedgerEvents { __typename id raw }
        }
      }
    }`, { o: { height: h } });
    const blk = d.block;
    if (!blk) continue;
    for (const tx of blk.transactions ?? []) {
      const evts = (tx.dustLedgerEvents ?? []) as Array<{ __typename: string; id: number; raw: string }>;
      if (evts.length === 0) continue;
      for (const e of evts) {
        try {
          const evt = LedgerEvent.deserialize(Buffer.from(e.raw, 'hex'));
          let ownerStr = '?';
          try {
            const out = (evt as { output?: unknown }).output;
            if (out && typeof out === 'object') {
              const o = (out as Record<string, unknown>)[OWNER_FIELD];
              ownerStr = o === undefined ? '(no owner field)' : String(o);
            }
          } catch (err) { ownerStr = `(decode:${(err as {message?:string}).message ?? err})`; }
          found.push({ height: h, ts: blk.timestamp, tx: tx.hash, etype: e.__typename, eid: e.id, owner: ownerStr });
          console.log(`block=${h} tx=${String(tx.hash).slice(0,12)} ${e.__typename} id=${e.id} owner=${ownerStr}`);
        } catch (err) {
          console.log(`block=${h} tx=${String(tx.hash).slice(0,12)} ${e.__typename} id=${e.id} RAW-DECODE-FAIL ${(err as {message?:string}).message ?? err}`);
        }
      }
    }
    if (h % 20 === 0) console.log(`  ... scanned to block ${h}`);
  }
  console.log('SCAN DONE', JSON.stringify(found, null, 2));
  process.exit(0);
};

main().catch(async (e) => {
  console.error(`scan failed: ${(e as { message?: string }).message ?? String(e)}`);
  process.exit(1);
});
