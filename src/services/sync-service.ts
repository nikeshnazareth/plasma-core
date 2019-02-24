import {constants, serialization, utils} from 'plasma-utils';

import {BaseService, ServiceOptions} from './base-service';
import {Deposit, Exit} from './models/chain';
import {BlockSubmittedEvent, DepositEvent, ExitFinalizedEvent, ExitStartedEvent} from './models/events';

const models = serialization.models;
const SignedTransaction = models.SignedTransaction;

interface UserSyncOptions extends ServiceOptions {
  transactionPollInterval?: number;
}

interface SyncOptions extends ServiceOptions {
  transactionPollInterval: number;
}

interface DefaultSyncOptions {
  transactionPollInterval: number;
}

const defaultOptions: DefaultSyncOptions = {
  transactionPollInterval: 15000
};

export class SyncService extends BaseService {
  options!: SyncOptions;
  dependencies = [
    'eth', 'chain', 'eventHandler', 'syncdb', 'chaindb', 'wallet', 'operator'
  ];
  pending: string[] = [];
  polling = false;

  constructor(options: UserSyncOptions) {
    super(options, defaultOptions);
  }

  async onStart(): Promise<void> {
    this.attachHandlers();
  }

  /**
   * Starts regularly polling pending transactions.
   */
  async startPollInterval(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    this.pollInterval();
  }

  /**
   * Polling loop that checks for new transactions.
   */
  private async pollInterval(): Promise<void> {
    if (!this.started) return;

    try {
      await this.checkPendingTransactions();
    } finally {
      await utils.sleep(this.options.transactionPollInterval);
      this.pollInterval();
    }
  }

  /**
   * Attaches handlers to Ethereum events.
   */
  private attachHandlers(): void {
    const handlers: {[key: string]: Function} = {
      Deposit: this.onDeposit,
      BlockSubmitted: this.onBlockSubmitted,
      ExitStarted: this.onExitStarted,
      ExitFinalized: this.onExitFinalized
    };

    for (const event of Object.keys(handlers)) {
      this.services.eventHandler.on(
          `event:${event}`, handlers[event].bind(this));
    }
  }

  /**
   * Checks for any available pending transactions and emits an event for each.
   */
  private async checkPendingTransactions() {
    if (!this.services.operator.online ||
        !this.services.eth.contract.hasAddress) {
      return;
    }

    const lastSyncedBlock = await this.services.syncdb.getLastSyncedBlock();
    const firstUnsyncedBlock = lastSyncedBlock + 1;
    const currentBlock = await this.services.chaindb.getLatestBlock();
    const prevFailed = await this.services.syncdb.getFailedTransactions();

    if (firstUnsyncedBlock <= currentBlock) {
      this.log(`Checking for new transactions between plasma blocks ${
          firstUnsyncedBlock} and ${currentBlock}.`);
    } else if (prevFailed.length > 0) {
      this.log(`Attempting to apply failed transactions.`);
    } else {
      return;
    }

    // TODO: Figure out how handle operator errors.
    const addresses = await this.services.wallet.getAccounts();
    for (const address of addresses) {
      const received = await this.services.operator.getReceivedTransactions(
          address, firstUnsyncedBlock, currentBlock);
      this.pending = this.pending.concat(received);
    }

    // Add any previously failed transactions to try again.
    this.pending = this.pending.concat(prevFailed);

    // Remove any duplicates
    this.pending = [...new Set(this.pending)];

    const failed = [];
    for (let i = 0; i < this.pending.length; i++) {
      const encoded = this.pending[i];
      const tx = new SignedTransaction(encoded);

      // Make sure we're not importing transactions we don't have blocks for.
      // Necessary because of a bug in the operator.
      // TODO: Fix operator so this isn't necessary.
      if (tx.block.gtn(currentBlock)) {
        continue;
      }

      try {
        await this.addTransaction(tx);
      } catch (err) {
        failed.push(encoded);
        this.log(`ERROR: ${err}`);
        this.log(`Ran into an error while importing transaction: ${
            tx.hash}, trying again in a few seconds...`);
      }
    }

    await this.services.syncdb.setFailedTransactions(failed);
    await this.services.syncdb.setLastSyncedBlock(currentBlock);
  }

  /**
   * Tries to add any newly received transactions.
   * @param tx A signed transaction.
   */
  async addTransaction(tx: serialization.models.SignedTransaction) {
    // TODO: The operator should really be avoiding this.
    if (tx.transfers[0].sender === constants.NULL_ADDRESS ||
        (await this.services.chaindb.hasTransaction(tx.hash))) {
      return;
    }

    this.log(`Detected new transaction: ${tx.hash}`);
    this.log(`Attemping to pull information for transaction: ${tx.hash}`);
    let txdata;
    try {
      txdata = await this.services.operator.getTransactionProof(tx.encoded);
    } catch (err) {
      this.log(`ERROR: Operator failed to return information for transaction: ${
          tx.hash}`);
      throw err;
    }

    this.log(`Importing new transaction: ${tx.hash}`);
    await this.services.chain.addTransaction(
        txdata.transaction, txdata.deposits, txdata.proof);
    this.log(`Successfully imported transaction: ${tx.hash}`);
  }

  /**
   * Handles new deposit events.
   * @param deposits Deposit events.
   */
  async onDeposit(events: DepositEvent[]): Promise<void> {
    const deposits = events.map((event) => {
      return event.toDeposit();
    });
    await this.services.chain.addDeposits(deposits);
  }

  /**
   * Handles new block events.
   * @param blocks Block submission events.
   */
  async onBlockSubmitted(events: BlockSubmittedEvent[]): Promise<void> {
    const blocks = events.map((event) => {
      return event.toBlock();
    });
    await this.services.chaindb.addBlockHeaders(blocks);
  }

  /**
   * Handles new exit started events.
   * @param exits Exit started events.
   */
  async onExitStarted(events: ExitStartedEvent[]): Promise<void> {
    const exits = events.map((event) => {
      return event.toExit();
    });
    for (const exit of exits) {
      await this.services.chain.addExit(exit);
    }
  }

  /**
   * Handles new exit finalized events.
   * @param exits Exit finalized events.
   */
  async onExitFinalized(exits: ExitFinalizedEvent[]): Promise<void> {
    for (const exit of exits) {
      await this.services.chaindb.markFinalized(exit);
      await this.services.chaindb.addExitableEnd(exit.token, exit.start);
    }
  }
}
