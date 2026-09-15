// SPDX-License-Identifier: Apache-2.0
//
// Raw relay submission for the preprod deploy lane.
//
// Wire-proven 2026-09-15: the preprod node closes the WebSocket (code 1000, no
// reason) when it receives `author_submitAndWatchExtrinsic` — polkadot-js's
// watch-submit path that wallet-sdk 1.2.0 uses for every submission. The same
// serialized transaction submitted bare (`author_submitExtrinsic`, one-shot
// JSON-RPC, no subscription) is accepted into the mempool and lands in a block
// (verified: dust-mint tx `e18807db…` in preprod block 2562382). So we bypass
// the SDK submission service with a minimal relay client.
//
// The relay answers plain JSON-RPC frames with no polkadot-js handshake
// (verified live). Inclusion is NOT waited on here: the wallet's own live
// subscriptions (dust coins for the mint) and deployContract's
// publicDataProvider.watchForTxData cover the on-chain wait.

import { WebSocket } from 'ws';
import { type FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { SerializedTransaction } from '@midnight-ntwrk/wallet-sdk-abstractions';

const compactToU8a = (value: number): Uint8Array => {
  if (value <= 0x3f) return new Uint8Array([value << 2]);
  if (value <= 0x3fff) {
    const v = (value << 2) | 0b01;
    return new Uint8Array([v & 0xff, v >> 8]);
  }
  const v = (value << 2) | 0b10;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
};

/**
 * The relay's `author_submitExtrinsic` takes its extrinsic as a SCALE-encoded
 * `OpaqueExtrinsic` (a `Vec<u8>`): compact length prefix + bytes. polkadot-js's
 * `Bytes` codec encodes RPC params exactly this way (compactAddLength), so a
 * bare `SerializedTransaction` (raw SCALE tx bytes, no length prefix) is
 * rejected at decode time with "Could not decode OpaqueExtrinsic.0: Not enough
 * data to decode vector" (wire-proven 2026-09-15 — see probe-framing.ts).
 */
const scalePrefix = (raw: Uint8Array): Uint8Array =>
  new Uint8Array([...compactToU8a(raw.length), ...raw]);

const hexOf = (tx: FinalizedTransaction): string => Buffer.from(scalePrefix(SerializedTransaction.from(tx))).toString('hex');

/** Submit a finalized transaction via bare `author_submitExtrinsic`. Resolves with the node-returned tx hash. */
export const submitRaw = async (tx: FinalizedTransaction, nodeWsUrl: string, timeoutMs = 90_000): Promise<string> => {
  const hex = hexOf(tx);
  const ws = new WebSocket(nodeWsUrl);
  let answered = false;
  const fail = (msg: string): void => {
    if (!answered) {
      answered = true;
      try { ws.close(); } catch {}
      throw new Error(msg);
    }
  };
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`relay submit timeout after ${timeoutMs}ms (no response)`)), timeoutMs);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'author_submitExtrinsic', params: [`0x${hex}`] }));
    });
    ws.on('message', (data) => {
      const frame = JSON.parse(String(data));
      if (frame.id !== 1) return;
      answered = true;
      clearTimeout(timer);
      if (frame.error) {
        reject(new Error(`relay rejected tx: ${JSON.stringify(frame.error)}`));
      } else {
        resolve(String(frame.result));
      }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      reject(new Error('relay ws error'));
    });
    ws.on('close', (code, reason) => {
      if (!answered) {
        clearTimeout(timer);
        reject(new Error(`relay closed ws before answering: ${code} ${reason}`));
      }
    });
  }).finally(() => {
    try { ws.close(); } catch {}
  });
};
