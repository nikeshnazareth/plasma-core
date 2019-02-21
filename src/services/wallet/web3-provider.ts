import { BaseWalletProvider } from './base-provider';
import { BaseETHProvider } from '../eth/base-provider';

interface Web3WalletExposedServices {
  eth: BaseETHProvider;
}

export class Web3WalletProvider extends BaseWalletProvider {
  services!: Web3WalletExposedServices;
  dependencies = ['eth'];

  async getAccounts(): Promise<string[]> {
    return this.services.eth.getAccounts();
  }

  async sign(address: string, data: string): Promise<string> {
    return this.services.eth.sign(data, address);
  }
}
