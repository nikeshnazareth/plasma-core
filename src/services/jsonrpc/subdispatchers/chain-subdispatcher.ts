import { BaseSubdispatcher } from './base-subdispatcher';

/**
 * Subdispatcher that handles chain-related requests.
 */
export class ChainSubdispatcher extends BaseSubdispatcher {
  prefix = 'pg_';
  dependencies = ['chain', 'chaindb'];

  get methods(): { [key: string]: Function } {
    const chain = this.app.services.chain;
    const chaindb = this.app.services.chaindb;
    return {
      getBlockHeader: chaindb.getBlockHeader.bind(chaindb),
      getTransaction: chaindb.getTransaction.bind(chaindb),
      getLastSyncedBlock: chaindb.getLatestBlock.bind(chaindb),
      sendTransaction: chain.sendTransaction.bind(chain),
      pickRanges: chain.pickRanges.bind(chain),
      startExit: chain.startExit.bind(chain),
      finalizeExits: chain.finalizeExits.bind(chain),
      getExits: chain.getExitsWithStatus.bind(chain),
      getBalances: chain.getBalances.bind(chain)
    };
  }
}
