const BaseService = require('../../base-service')

/**
 * Handles wallet-related DB calls.
 */
class WalletDB extends BaseService {
  get name () {
    return 'walletdb'
  }

  get dependencies () {
    return ['web3']
  }

  async _onStart () {
    await this.services.db.open('wallet')
  }

  /**
   * Returns all available accounts.
   * @return {Array} A list of Web3 account objects.
   */
  async getAccounts () {
    return this.services.db.wallet.get('accounts', [])
  }

  /**
   * Returns an account object for a given address.
   * @param {string} address Adress of the account.
   * @return {*} A Web3 account object.
   */
  async getAccount (address) {
    const keystore = await this.services.db.wallet.get(
      `keystore:${address}`,
      null
    )
    if (!keystore) {
      throw new Error('Account not found.')
    }

    return this.services.web3.eth.accounts.privateKeyToAccount(
      keystore.privateKey
    )
  }

  /**
   * Adds an account to the database.
   * @param {*} account A Web3 account object.
   */
  async addAccount (account) {
    const accounts = await this.getAccounts()
    accounts.push(account.address)
    await this.services.db.wallet.set('accounts', accounts)
    await this.services.db.wallet.set(`keystore:${account.address}`, account)
  }
}

module.exports = WalletDB
