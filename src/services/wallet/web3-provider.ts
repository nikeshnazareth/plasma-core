import { BaseWalletProvider } from './base-provider';
import { BaseWeb3Provider } from '../web3/base-provider';
import Web3 from 'web3';

interface Web3WalletExposedServices {
  web3: BaseWeb3Provider;
}

export class Web3WalletProvider extends BaseWalletProvider {
  services!: Web3WalletExposedServices;
  dependencies = ['web3'];

  get web3(): Web3 {
    if (!this.services.web3.web3) {
      throw new Error('Web3 is undefined.');
    }

    return this.services.web3.web3;
  }

  async getAccounts(): Promise<string[]> {
    return this.web3.eth.getAccounts();
  }

  async sign(address: string, data: string): Promise<string> {
    return this.web3.eth.sign(data, address);
  }
}
