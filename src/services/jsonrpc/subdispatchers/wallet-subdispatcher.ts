import { BaseSubdispatcher } from './base-subdispatcher'

/**
 * Subdispatcher that handles wallet-related requests.
 */
export class WalletSubdispatcher extends BaseSubdispatcher {
  get prefix(): string {
    return 'pg_'
  }

  get dependencies(): string[] {
    return ['wallet']
  }

  get methods(): { [key: string]: (...args: any) => any } {
    const wallet = this.app.services.wallet
    return {
      /* Wallet */
      createAccount: wallet.createAccount.bind(wallet),
      getAccounts: wallet.getAccounts.bind(wallet),
      sign: wallet.sign.bind(wallet),
    }
  }
}
