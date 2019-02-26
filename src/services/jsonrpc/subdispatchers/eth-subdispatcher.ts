import { BaseSubdispatcher } from './base-subdispatcher'

/**
 * Subdispatcher that handles Ethereum-related requests.
 */
export class ETHSubdispatcher extends BaseSubdispatcher {
  get prefix(): string {
    return 'pg_'
  }

  get dependencies(): string[] {
    return ['eth']
  }

  get methods(): { [key: string]: (...args: any) => any } {
    const contract = this.app.services.eth.contract
    const eth = this.app.services.eth
    return {
      /* Contract */
      deposit: contract.deposit.bind(contract),
      getCurrentBlock: contract.getCurrentBlock.bind(contract),
      getTokenId: contract.getTokenId.bind(contract),
      listToken: contract.listToken.bind(contract),

      /* ETH */
      getCurrentEthBlock: eth.getCurrentBlock.bind(eth),
      getEthBalance: eth.getBalance.bind(eth),
    }
  }
}
