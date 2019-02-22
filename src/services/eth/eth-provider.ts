import BigNum from 'bn.js';
import Web3 from 'web3';
import { ServiceOptions } from '../base-service';
import { BaseETHProvider } from './base-provider';
import { BaseContractProvider } from './contract/base-provider';
import { ContractProvider } from './contract/contract-provider';
import { UserContractOptions } from './contract/contract-provider';
import { EthereumAccount, isAccount } from '../models/eth';

interface UserETHProviderOptions extends ServiceOptions, UserContractOptions {
  ethereumEndpoint?: string;
}

export class ETHProvider extends BaseETHProvider {
  contract: BaseContractProvider;
  private _web3?: Web3;

  constructor(options: UserETHProviderOptions) {
    super(options);
    this.contract = new ContractProvider(options);
  }

  async onStart(): Promise<void> {
    await this.contract.start();
    this._web3 = new Web3(
      new Web3.providers.HttpProvider(this.options.ethereumEndpoint)
    );
  }

  /**
   * @returns the current Web3 instance.
   */
  get web3(): Web3 {
    if (this._web3 === undefined) {
      throw new Error('Web3 is undefined.');
    }

    return this._web3;
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

  async getBalance(address: string): Promise<BigNum> {
    const balance = await this.web3.eth.getBalance(address);
    return new BigNum(balance, 10);
  }

  async getCurrentBlock(): Promise<number> {
    return this.web3.eth.getBlockNumber();
  }

  async getAccounts(): Promise<string[]> {
    return this.web3.eth.getAccounts();
  }

  async sign(address: string, data: string): Promise<string> {
    return this.web3.eth.sign(data, address);
  }

  async getWalletAccounts(): Promise<string[]> {
    const wallet = this.web3.eth.accounts.wallet;
    const keys = Object.keys(wallet);
    return keys.filter((key) => {
      return this.web3.utils.isAddress(key);
    });
  }

  async getWalletAccount(address: string): Promise<EthereumAccount> {
    const wallet: { [key: string]: any } = this.web3.eth.accounts.wallet;
    for (const key of Object.keys(wallet)) {
      const value = wallet[key];
      if (key === address && isAccount(value)) {
        return value as EthereumAccount;
      }
    }

    throw new Error('Account not found.');
  }

  async hasWalletAccount(address: string): Promise<boolean> {
    const accounts = await this.getWalletAccounts();
    return accounts.includes(address);
  }

  async addWalletAccount(privateKey: string): Promise<void> {
    await this.web3.eth.accounts.wallet.add(privateKey);
  }
}
