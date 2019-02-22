import { BaseWalletProvider } from './base-provider';
import { EthereumAccount } from '../models/eth-objects';
import { Account } from 'eth-lib';

export class LocalWalletProvider extends BaseWalletProvider {
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

  async addAccountToWallet(address: string): Promise<void> {
    const hasAccount = await this.services.eth.hasWalletAccount(address);
    if (hasAccount) return;

    const account = await this.getAccount(address);
    await this.services.eth.addWalletAccount(account.privateKey);
  }
}
