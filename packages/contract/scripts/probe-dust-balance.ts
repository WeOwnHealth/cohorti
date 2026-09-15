// SPDX-License-Identifier: Apache-2.0
// One-shot probe: sync the deploy wallet (relaxed gate) and print its tDUST
// state as the SDK sees it from the indexer. Safe to delete.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

import { createLogger } from './logger.ts';
import { MidnightWalletProvider, syncWalletDeploy } from './wallet.ts';

const PREPROD_ENV_BASE = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
} as const;

const main = async (): Promise<void> => {
  setNetworkId('preprod');
  const config: EnvironmentConfiguration = {
    ...PREPROD_ENV_BASE,
    proofServer: process.env.PROOF_SERVER_URL ?? 'https://proof-server.preprod.midnight.network',
  } as EnvironmentConfiguration;
  const logger = createLogger();
  const seed = process.env.WALLET_SEED;
  if (!seed) throw new Error('WALLET_SEED required');

  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);
  await walletProvider.start();
  await syncWalletDeploy(logger, walletProvider.wallet);

  const state = await Rx.firstValueFrom(walletProvider.wallet.state());
  const unshielded = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dust = await walletProvider.wallet.dust.getAddress();
  const balance = state.dust.balance(new Date());
  const coins = state.dust.totalCoins ?? [];

  console.log(JSON.stringify({
    unshielded_tnight: unshielded.toString(),
    dust_address: dust.toString(),
    dust_balance: balance.toString(),
    dust_balance_from_coins: coins.reduce((acc, c) => acc + (c.generatedNow ?? 0n), 0n).toString(),
    dust_total_coins: coins.length,
    dust_coins: coins.map((c) => ({ token: c.token?.toString?.() ?? String(c.token), generatedNow: (c.generatedNow ?? 0n).toString(), dtime: c.dtime?.toISOString?.() ?? String(c.dtime) })),
  }, null, 2));

  await walletProvider.stop();
  process.exit(0);
};

main().catch(async (e) => {
  console.error(`probe failed: ${(e as { message?: string }).message ?? String(e)}`);
  process.exit(1);
});
