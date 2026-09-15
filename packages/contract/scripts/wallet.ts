// SPDX-License-Identifier: Apache-2.0
//
// Midnight wallet plumbing for the preprod deploy script.
// Faithful port of midnightntwrk/example-bboard (bboard-cli/src) trimmed to
// what HealthClaimGate needs: a seed-driven WalletFacade that balances and
// submits transactions, a sync helper, unshielded-fund wait, and dust-token
// generation (preprod pays tx fees in tDUST minted from unshielded tNIGHT).

import {
  type CoinPublicKey,
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  LedgerParameters,
  ZswapSecretKeys,
  unshieldedToken,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type MidnightProvider, type UnboundTransaction, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type FacadeState, type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { createKeystore, type UnshieldedWalletState } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { type ShieldedWalletState } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import {
  type DustWalletOptions,
  type EnvironmentConfiguration,
  FaucetClient,
  FluentWalletBuilder,
} from '@midnight-ntwrk/testkit-js';
import { type Logger } from 'pino';
import * as Rx from 'rxjs';

export const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/** Wallet + Midnight providers backed by a WalletFacade built from a seed. */
export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  readonly wallet: WalletFacade;
  private readonly logger: Logger;
  private readonly env: EnvironmentConfiguration;
  private readonly zswapSecretKeys: ZswapSecretKeys;
  private readonly dustSecretKey: DustSecretKey;
  private readonly unshieldedKeystore: {
    getPublicKey(): unknown;
    signData(payload: Uint8Array): string;
  };

  private constructor(
    logger: Logger,
    env: EnvironmentConfiguration,
    wallet: WalletFacade,
    zswapSecretKeys: ZswapSecretKeys,
    dustSecretKey: DustSecretKey,
    unshieldedKeystore: { getPublicKey(): unknown; signData(payload: Uint8Array): string },
  ) {
    this.logger = logger;
    this.env = env;
    this.wallet = wallet;
    this.zswapSecretKeys = zswapSecretKeys;
    this.dustSecretKey = dustSecretKey;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  static async build(logger: Logger, env: EnvironmentConfiguration, seed?: string): Promise<MidnightWalletProvider> {
    const dustOptions: DustWalletOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    };
    const builder = FluentWalletBuilder.forEnvironment(env).withDustOptions(dustOptions);
    const buildResult = seed
      ? await builder.withSeed(seed).buildWithoutStarting()
      : await builder.withRandomSeed().buildWithoutStarting();
    const { wallet, seeds, keystore } = buildResult as unknown as {
      wallet: WalletFacade;
      seeds: { masterSeed: string; shielded: Uint8Array; dust: Uint8Array };
      keystore: { getPublicKey(): unknown; signData(payload: Uint8Array): string };
    };
    const initialState = await Rx.firstValueFrom(wallet.shielded.state);
    logger.info(
      `Wallet ready — seed: ${seeds.masterSeed} · shielded coin pubkey: ${initialState.address.coinPublicKeyString()}`,
    );
    return new MidnightWalletProvider(
      logger,
      env,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore,
    );
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl },
    );
    const signedRecipe = await this.wallet.signRecipe(recipe, (payload) => this.unshieldedKeystore.signData(payload));
    return this.wallet.finalizeRecipe(signedRecipe);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }

  async start(): Promise<void> {
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  async stop(): Promise<void> {
    await this.wallet.stop();
  }
}

const isProgressStrictlyComplete = (progress: unknown): boolean => {
  if (!progress || typeof progress !== 'object') return false;
  const candidate = progress as { isStrictlyComplete?: unknown };
  if (typeof candidate.isStrictlyComplete !== 'function') return false;
  return (candidate.isStrictlyComplete as () => boolean)();
};

const isFacadeStateSynced = (state: FacadeState): boolean =>
  isProgressStrictlyComplete(state.shielded.state.progress) &&
  isProgressStrictlyComplete(state.dust.state.progress) &&
  isProgressStrictlyComplete(state.unshielded.progress);

export const syncWallet = (logger: Logger, wallet: WalletFacade, throttleTime = 2_000): Promise<FacadeState> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state: FacadeState) => {
        const n = (x: unknown): string => (typeof x === 'bigint' ? x.toString() : String(x ?? '-'));
        const sp = state.shielded.state.progress as { appliedIndex?: unknown; highestRelevantWalletIndex?: unknown; isConnected?: boolean };
        const dp = state.dust.state.progress as { appliedIndex?: unknown; highestRelevantWalletIndex?: unknown; isConnected?: boolean };
        logger.debug(
          `Wallet sync { shielded=${isProgressStrictlyComplete(state.shielded.state.progress)} si=${n(sp.appliedIndex)}/${n(sp.highestRelevantWalletIndex)} conn=${sp.isConnected}, unshielded=${isProgressStrictlyComplete(state.unshielded.progress)}, dust=${isProgressStrictlyComplete(state.dust.state.progress)} di=${n(dp.appliedIndex)}/${n(dp.highestRelevantWalletIndex)} conn=${dp.isConnected} }`,
        );
      }),
      Rx.throttleTime(throttleTime),
      Rx.filter((state: FacadeState) => isFacadeStateSynced(state)),
    ),
  );

const getInitialShieldedState = async (wallet: WalletFacade): Promise<ShieldedWalletState> =>
  Rx.firstValueFrom(wallet.shielded.state);

export const getUnshieldedSeed = (seed: string): Uint8Array => {
  const hdWalletResult = HDWallet.fromSeed(Buffer.from(seed, 'hex')) as {
    type: 'seedOk';
    hdWallet: HDWallet;
  };
  const derivationResult = hdWalletResult.hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);
  if (derivationResult.type === 'keyOutOfBounds') {
    throw new Error('Key derivation out of bounds');
  }
  return derivationResult.key;
};

export const generateDust = async (
  logger: Logger,
  walletSeed: string,
  unshieldedState: UnshieldedWalletState,
  wallet: WalletFacade,
): Promise<string | undefined> => {
  const dustState = await wallet.dust.waitForSyncedState();
  const networkId = getNetworkId();
  const unshieldedKeystore = createKeystore(getUnshieldedSeed(walletSeed), networkId);
  const utxos = unshieldedState.availableCoins.filter((coin) => !coin.meta.registeredForDustGeneration);
  if (utxos.length === 0) {
    logger.info('No unregistered UTXOs for dust generation (dust already minted?).');
    return undefined;
  }
  logger.info(`Generating dust from ${utxos.length} unshielded UTXO(s)...`);
  const recipe = await wallet.registerNightUtxosForDustGeneration(
    utxos,
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload),
    dustState.address,
  );
  const transaction = await wallet.finalizeRecipe(recipe);
  const txId = await wallet.submitTransaction(transaction);
  logger.info(`Dust generation tx submitted: ${txId}`);
  return txId;
};

/** Waits for a positive unshielded balance (optionally requesting from the faucet first). */
export const waitForUnshieldedFunds = async (
  logger: Logger,
  wallet: WalletFacade,
  env: EnvironmentConfiguration,
  waitIfEmpty: boolean,
): Promise<UnshieldedWalletState> => {
  const initialState = await Rx.firstValueFrom(wallet.unshielded.state);
  const unshieldedAddress = UnshieldedAddress.codec.encode(getNetworkId(), initialState.address);
  logger.info(`Unshielded address: ${unshieldedAddress.toString()}`);
  const initialBalance = initialState.balances[unshieldedToken().raw];
  if ((initialBalance === undefined || initialBalance === 0n) && !waitIfEmpty) {
    logger.info('Unshielded balance is 0 and WAIT_FUNDS is not set — deploy cannot be funded yet.');
    return initialState;
  }
  if (initialBalance === undefined || initialBalance === 0n) {
    if (env.faucet) {
      logger.info('Requesting tokens from the preprod faucet...');
      await new FaucetClient(env.faucet, logger).requestTokens(unshieldedAddress.toString());
    }
    logger.info('Waiting for incoming tNIGHT...');
    return Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(2_000),
        Rx.filter(
          (state: FacadeState) => isFacadeStateSynced(state) && (state.unshielded.balances[unshieldedToken().raw] ?? 0n) > 0n,
        ),
        Rx.map((state: FacadeState) => state.unshielded),
      ),
    );
  }
  return initialState;
};
