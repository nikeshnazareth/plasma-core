import Web3 from 'web3';
import { BaseWeb3Provider, DefaultWeb3Options, UserWeb3Options } from './base-provider';

const defaultOptions: DefaultWeb3Options = {
  ethereumEndpoint: 'http://localhost:8545'
};

export class Web3Provider extends BaseWeb3Provider {
  constructor(options: UserWeb3Options) {
    super(options, defaultOptions);
  }

  async onStart(): Promise<void> {
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(this.options.ethereumEndpoint)
    );
    Object.assign(this, this.web3);
  }

  async connected(): Promise<boolean> {
    if (!this.web3) return false;

    try {
      await this.web3.eth.net.isListening();
      return true;
    } catch (e) {
      return false;
    }
  }
}
