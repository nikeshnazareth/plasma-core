import { BaseService } from '../base-service';

export class BaseWalletProvider extends BaseService {
  /**
   * Returns the addresses of all accounts in this wallet.
   * @returns the list of addresses in this wallet.
   */
  async getAccounts(): Promise<string[]> {
    throw new Error(
      'Classes that extend BaseWalletProvider must implement this method'
    );
  }

  /**
   * @returns the keystore file for a given account.
   */
  async getAccount(address: string): Promise<any> {
    throw new Error(
      'Classes that extend BaseWalletProvider must implement this method'
    );
  }

  /**
   * Signs a piece of arbitrary data.
   * @param address Address of the account to sign with.
   * @param data Data to sign
   * @returns a signature over the data.
   */
  async sign(address: string, data: string): Promise<string> {
    throw new Error(
      'Classes that extend BaseWalletProvider must implement this method'
    );
  }

  /**
   * Creates a new account.
   * @returns the account's address.
   */
  async createAccount(): Promise<string> {
    throw new Error(
      'Classes that extend BaseWalletProvider must implement this method'
    );
  }
  
  /**
   * Adds an account to the web3 wallet so that it can send contract transactions directly.
   * See https://bit.ly/2MPAbRd for more information.
   * @param address Address of the account to add to wallet.
   */
  async addAccountToWallet(address: string): Promise<void> {
    throw new Error(
      'Classes that extend BaseWalletProvider must implement this method'
    );
  }
}
