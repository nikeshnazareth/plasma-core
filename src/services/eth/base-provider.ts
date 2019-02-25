import BigNum from 'bn.js';

import {BaseService, ServiceOptions} from '../base-service';
import {EthereumAccount} from '../models/eth';

import {BaseContractProvider, UserContractOptions} from './contract/base-provider';

export interface UserETHProviderOptions extends UserContractOptions {
  ethereumEndpoint?: string;
}

interface ETHProviderOptions extends ServiceOptions {
  ethereumEndpoint: string;
}

interface DefaultETHProviderOptions {
  ethereumEndpoint: string;
}

const defaultOptions: DefaultETHProviderOptions = {
  ethereumEndpoint: 'http://localhost:8545'
};

export class BaseETHProvider extends BaseService {
  options!: ETHProviderOptions;
  contract: BaseContractProvider;

  constructor(options: UserETHProviderOptions&ServiceOptions) {
    super(options, defaultOptions);
    this.contract = new BaseContractProvider(options);
  }

  /**
   * @returns `true` if the node is connected to Ethereum, `false` otherwise.
   */
  async connected(): Promise<boolean> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Returns the current ETH balance of an address.
   * Queries the main chain, *not* the plasma chain.
   * @param address Address to query.
   * @returns The account's ETH balance.
   */
  async getBalance(address: string): Promise<BigNum> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * @returns The current ETH block.
   */
  async getCurrentBlock(): Promise<number> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Returns the addresses of all exposed web3 accounts.
   * @returns the list of addresses.
   */
  async getAccounts(): Promise<string[]> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * @returns the list of address in the user's wallet.
   */
  async getWalletAccounts(): Promise<string[]> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Returns the account object for a given account.
   * @param address Address of the account.
   * @returns the account object.
   */
  async getWalletAccount(address: string): Promise<EthereumAccount> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Checks if the wallet has the given account.
   * @param address Address to check.
   * @returns `true` if the wallet has account, `false` otherwise.
   */
  async hasWalletAccount(address: string): Promise<boolean> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Adds an account to the user's wallet.
   * @param privateKey the account's private key.
   */
  async addWalletAccount(privateKey: string): Promise<void> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }

  /**
   * Signs a piece of arbitrary data.
   * Address must be unlocked.
   * @param address Address of the account to sign with.
   * @param data Data to sign
   * @returns a signature over the data.
   */
  async sign(address: string, data: string): Promise<string> {
    throw new Error(
        'Classes that extend BaseETHProvider must implement this method.');
  }
}
