// SPDX-License-Identifier: Apache-2.0
// One-shot: replay the on-chain DustInitialUtxo from the designation tx
// (or any given raw event) through the SDK's own DustLocalState filtered by
// OUR dust secret key. If the created dust UTXO is owned by us, it appears in
// state.utxos — that is on-chain ground truth for "tDUST landed at our address".
// Safe to delete.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { DustSecretKey, DustLocalState, Event, LedgerParameters } from '@midnight-ntwrk/ledger-v8';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

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

const main = async (): Promise<void> => {
  setNetworkId('preprod');
  const config: EnvironmentConfiguration = {
    ...PREPROD_ENV_BASE,
    proofServer: process.env.PROOF_SERVER_URL ?? 'https://proof-server.preprod.midnight.network',
  } as EnvironmentConfiguration;
  const logger = createLogger();
  const seed = process.env.WALLET_SEED;
  if (!seed) throw new Error('WALLET_SEED required');

  // We only need the derived dust secret key — build without starting sync.
  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);
  const sk = (walletProvider as unknown as { dustSecretKey: DustSecretKey }).dustSecretKey;
  const ourAddress = await walletProvider.wallet.dust.getAddress();
  console.log('OUR DUST ADDRESS:', ourAddress);
  console.log('OUR DUST PUBKEY:', sk.publicKey);

  // Fetch dust events from the designation tx (425ac68f) and any tx we can find
  // by scanning recent blocks for DustInitialUtxo events.
  const rawEvents: Array<{ id: number; raw: string; where: string }> = [];

  const d = await gql(`query T($o: TransactionOffset) {
    transactions(offset: $o) {
      hash block { height timestamp }
      dustLedgerEvents { __typename id raw }
    }
  }`, { o: { hash: '425ac68fac8b48dd460ee90b02627952e8e2f7b26e487f69cd7110d432f8f31e' } });
  for (const tx of d.transactions) {
    for (const e of tx.dustLedgerEvents) {
      rawEvents.push({ id: e.id, raw: e.raw, where: `designation-tx block=${tx.block.height}` });
    }
  }

  // Also scan a window of blocks after the designation for any further
  // DustInitialUtxo (the actual tDUST transfer, if separate from designation).
  const start = 2563799;
  const window = 260;
  console.log(`Scanning ${window} blocks after designation for dust events...`);
  for (let h = start; h < start + window; h++) {
    const b = await gql(`query B($o: BlockOffset) {
      block(offset: $o) { height transactions { hash dustLedgerEvents { __typename id raw } } }
    }`, { o: { height: h } });
    const blk = b.block;
    if (!blk) continue;
    for (const tx of blk.transactions ?? []) {
      for (const e of tx.dustLedgerEvents ?? []) {
        rawEvents.push({ id: e.id, raw: e.raw, where: `block=${h} tx=${String(tx.hash).slice(0,12)}` });
      }
    }
    if (h % 50 === 0) console.log(`  ... scanned to ${h}`);
  }

  console.log(`\nTOTAL dust events in window: ${rawEvents.length}`);
  const ours: Array<{ id: number; where: string; utxoCount: number }> = [];
  for (const ev of rawEvents) {
    try {
      const ledgerEvent = Event.deserialize(Buffer.from(ev.raw, 'hex'));
      const st = new DustLocalState(LedgerParameters.initialParameters());
      const after = st.replayEventsWithChanges(sk, [ledgerEvent]);
      if (after.state.utxos.size > 0) {
        ours.push({ id: ev.id, where: ev.where, utxoCount: after.state.utxos.size });
        console.log(`🤝 owner=US id=${ev.id} ${ev.where} utxos=${after.state.utxos.size}`);
      }
    } catch (err) {
      const msg = (err as { message?: string }).message ?? String(err);
      if (!msg.includes('not owned')) {
        console.log(`  (replay err id=${ev.id} ${ev.where}: ${msg.slice(0,120)})`);
      }
    }
  }
  console.log('\nRESULT events-owning-our-key:', JSON.stringify(ours, null, 2));
  if (ours.length === 0) console.log('=> No dust UTXO in the scanned window is owned by our key.');
  process.exit(0);
};

main().catch(async (e) => {
  console.error(`probe failed: ${(e as { message?: string }).message ?? String(e)}`);
  process.exit(1);
});
