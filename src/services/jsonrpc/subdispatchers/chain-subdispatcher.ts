import { BaseSubdispatcher } from './base-subdispatcher'

/**
 * Subdispatcher that handles chain-related requests.
 */
export class ChainSubdispatcher extends BaseSubdispatcher {
  get prefix(): string {
    return 'pg_'
  }

  get dependencies(): string[] {
    return ['chain', 'chaindb']
  }

  get methods(): { [key: string]: (...args: any) => any } {
    const chain = this.app.services.chain
    const chaindb = this.app.services.chaindb
    return {
      /* ChainDB */
      getBlockHeader: chaindb.getBlockHeader.bind(chaindb),
      getLastSyncedBlock: chaindb.getLatestBlock.bind(chaindb),
      getTransaction: chaindb.getTransaction.bind(chaindb),

      /* Chain */
      finalizeExits: chain.finalizeExits.bind(chain),
      getBalances: chain.getBalances.bind(chain),
      getExits: chain.getExitsWithStatus.bind(chain),
      pickRanges: chain.pickRanges.bind(chain),
      sendTransaction: chain.sendTransaction.bind(chain),
      startExit: chain.startExit.bind(chain),
    }
  }
}
