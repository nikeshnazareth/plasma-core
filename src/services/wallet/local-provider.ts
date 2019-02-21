import { BaseWalletProvider } from './base-provider';
import { BaseETHProvider } from '../eth/base-provider';
import { WalletDB } from '../db/interfaces/wallet-db';
import { EthereumAccount } from '../models/eth-objects';
import { Account } from 'eth-lib';

interface LocalWalletExposedServices {
  eth: BaseETHProvider;
  walletdb: WalletDB;
}

export class LocalWalletProvider extends BaseWalletProvider {
  services!: LocalWalletExposedServices;
  dependencies = ['eth', 'walletdb'];

  async getAccounts(): Promise<string[]> {
    return this.services.walletdb.getAccounts();
  }

  async getAccount(address: string): Promise<EthereumAccount> {
    return this.services.walletdb.getAccount(address);
  }

  async sign(address: string, data: string): Promise<string> {
    const account = await this.getAccount(address);
    const sig = Account.sign(data, account.privateKey);
    return sig.toString();
  }

  async createAccount(): Promise<string> {
    // TODO: Support encrypted accounts.
    const account = Account.create();
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
    const hasAccount = await this.services.eth.hasWalletAccount(address);
    if (hasAccount) return;

    const account = await this.getAccount(address);
    await this.services.eth.addWalletAccount(account.privateKey);
  }
}