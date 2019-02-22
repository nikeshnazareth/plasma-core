import { BaseSubdispatcher } from './base-subdispatcher';

/**
 * Subdispatcher that handles wallet-related requests.
 */
export class WalletSubdispatcher extends BaseSubdispatcher {
  prefix = 'pg_';
  dependencies = ['wallet'];

  get methods(): { [key: string]: Function } {
    const wallet = this.app.services.wallet;
    return {
      getAccounts: wallet.getAccounts.bind(wallet),
      sign: wallet.sign.bind(wallet),
      createAccount: wallet.createAccount.bind(wallet)
    };
  }
}
