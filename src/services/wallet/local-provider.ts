import { BaseWalletProvider } from './base-provider';
import { BaseWeb3Provider } from '../web3/base-provider';
import { WalletDB } from '../db/interfaces/wallet-db';
import { Account } from 'web3/types';
import Web3 from 'web3';

interface LocalWalletExposedServices {
  web3: BaseWeb3Provider;
  walletdb: WalletDB;
}

export class LocalWalletProvider extends BaseWalletProvider {
  services!: LocalWalletExposedServices;
  dependencies = ['web3', 'walletdb'];

  get web3(): Web3 {
    if (!this.services.web3.web3) {
      throw new Error('Web3 is undefined.');
    }

    return this.services.web3.web3;
  }

  async getAccounts(): Promise<string[]> {
    return this.services.walletdb.getAccounts();
  }

  async getAccount(address: string): Promise<Account> {
    return this.services.walletdb.getAccount(address);
  }

  async sign(address: string, data: string): Promise<string> {
    const account = await this.getAccount(address);
    const sig = this.web3.eth.accounts.sign(data, account.privateKey);
    return sig.toString();
  }

  async createAccount(): Promise<string> {
    // TODO: Support encrypted accounts.
    const account = this.web3.eth.accounts.create();
    await this.services.walletdb.addAccount(account);
    await this.addAccountToWallet(account.address);
    return account.address;
  }

  /**
   * Adds an account to the web3 wallet so that it can send contract transactions directly.
   * See https://bit.ly/2MPAbRd for more information.
   * @param address Address of the account to add to wallet.
   */
  async addAccountToWallet(address: string): Promise<void> {
    const accounts = await this.web3.eth.accounts.wallet;
    if (address in accounts) return;

    const account = await this.getAccount(address);
    await this.web3.eth.accounts.wallet.add(account.privateKey);
  }
}
