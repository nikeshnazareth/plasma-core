import BigNum from 'bn.js';
import Web3 from 'web3';
import { BaseService } from './base-service';
import { BaseWeb3Provider } from './web3/base-provider';

interface ETHExposedServices {
  web3: BaseWeb3Provider;
}

export class ETHService extends BaseService {
  services!: ETHExposedServices;
  dependencies = ['web3'];
  name = 'eth';

  /**
   * @returns The current Web3 instance.
   */
  get web3(): Web3 {
    if (this.services.web3.web3 === undefined) {
      throw new Error('ETHService cannot make Web3 call, Web3Provider is undefined.');
    }

    return this.services.web3.web3;
  }

  /**
   * Returns the current ETH balance of an address.
   * Queries the main chain, *not* the plasma chain.
   * @param address Address to query.
   * @returns The account's ETH balance.
   */
  async getBalance(address: string): Promise<BigNum> {
    const balance = await this.web3.eth.getBalance(address);
    return new BigNum(balance, 10);
  }

  /**
   * @returns The current ETH block.
   */
  async getCurrentBlock(): Promise<number> {
    return this.web3.eth.getBlockNumber();
  }
}
