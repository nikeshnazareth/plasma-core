import {Account} from 'eth-lib';

import {BaseService} from '../../base-service';
import {EthereumAccount} from '../../models/eth';
import {BaseDBProvider} from '../backends/base-provider';

export class WalletDB extends BaseService {
  dependencies = ['eth', 'db'];

  /**
   * @returns the current DB instance.
   */
  get db(): BaseDBProvider {
    const db = this.services.dbservice.dbs['wallet'];
    if (db === undefined) {
      throw new Error('WalletDB is not yet initialized.');
    }
    return db;
  }

  async onStart(): Promise<void> {
    await this.services.dbservice.open('wallet');
  }

  /**
   * Returns all available accounts.
   * @returns a list of account addresses.
   */
  async getAccounts(): Promise<string[]> {
    return (await this.db.get('accounts', []) as string[]);
  }

  /**
   * Returns an account object for a given address.
   * @param address Adress of the account.
   * @returns an Ethereum account object.
   */
  async getAccount(address: string): Promise<EthereumAccount> {
    const keystore =
        (await this.db.get(`keystore:${address}`, undefined) as
         EthereumAccount);
    if (keystore === undefined) {
      throw new Error('Account not found.');
    }

    return Account.fromPrivate(keystore.privateKey);
  }

  /**
   * Adds an account to the database.
   * @param account An Ethereum account object.
   */
  async addAccount(account: EthereumAccount): Promise<void> {
    const accounts = await this.getAccounts();
    accounts.push(account.address);
    await this.db.set('accounts', accounts);
    await this.db.set(`keystore:${account.address}`, account);
  }
}
