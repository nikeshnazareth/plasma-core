import { BaseSubdispatcher } from './base-subdispatcher';

/**
 * Subdispatcher that handles Ethereum-related requests.
 */
export class ETHSubdispatcher extends BaseSubdispatcher {
  prefix = 'pg_';
  dependencies = ['eth'];

  get methods(): { [key: string]: Function } {
    const contract = this.app.services.eth.contract;
    const eth = this.app.services.eth;
    return {
      listToken: contract.listToken.bind(contract),
      getTokenId: contract.getTokenId.bind(contract),
      deposit: contract.deposit.bind(contract),
      getCurrentBlock: contract.getCurrentBlock.bind(contract),
      getEthBalance: eth.getBalance.bind(eth),
      getCurrentEthBlock: eth.getCurrentBlock.bind(eth)
    };
  }
}
