import { BaseService } from '../../base-service';
import { BaseWeb3Provider } from '../../web3/base-provider';
import { DBService } from '../db-service';
import { BaseDBProvider } from '../backends/base-provider';
import { Account } from 'web3/types';
import Web3 from 'web3';

interface WalletDBExposedServices {
  web3: BaseWeb3Provider;
  dbservice: DBService;
}

export class WalletDB extends BaseService {
  services!: WalletDBExposedServices;
  dependencies = ['web3', 'db'];
  name = 'walletdb';

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

  /**
   * @returns the current Web3 instance.
   */
  get web3(): Web3 {
    const web3 = this.services.web3.web3;
    if (web3 === undefined) {
      throw new Error('Web3 is undefined.');
    }
    return web3;
  }

  async onStart(): Promise<void> {
    await this.services.dbservice.open('wallet');
  }

  /**
   * Returns all available accounts.
   * @returns a list of account addresses.
   */
  async getAccounts(): Promise<string[]> {
    return this.db.get('accounts', []);
  }

  /**
   * Returns an account object for a given address.
   * @param address Adress of the account.
   * @returns a Web3 account object.
   */
  async getAccount(address: string): Promise<Account> {
    const keystore = await this.db.get(`keystore:${address}`, undefined);
    if (keystore === undefined) {
      throw new Error('Account not found.');
    }

    return this.web3.eth.accounts.privateKeyToAccount(keystore.privateKey);
  }

  /**
   * Adds an account to the database.
   * @param account A Web3 account object.
   */
  async addAccount(account: Account): Promise<void> {
    const accounts = await this.getAccounts();
    accounts.push(account.address);
    await this.db.set('accounts', accounts);
    await this.db.set(`keystore:${account.address}`, account);
  }
}
