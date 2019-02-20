const BaseWalletProvider = require('./base-provider')

class LocalWalletProvider extends BaseWalletProvider {
  get dependencies () {
    return ['web3', 'walletdb']
  }

  async getAccounts () {
    return this.services.walletdb.getAccounts()
  }

  async getAccount (address) {
    return this.services.walletdb.getAccount(address)
  }

  async sign (address, data) {
    const account = await this.getAccount(address)
    return account.sign(data)
  }

  async createAccount () {
    // TODO: Support encrypted accounts.
    const account = this.services.web3.eth.accounts.create()
    await this.services.walletdb.addAccount(account)
    await this.addAccountToWallet(account.address)
    return account.address
  }

  /**
   * Adds an account to the web3 wallet so that it can send contract transactions directly.
   * See https://bit.ly/2MPAbRd for more information.
   * @param {string} address Address of the account to add to wallet.
   */
  async addAccountToWallet (address) {
    const accounts = await this.services.web3.eth.accounts.wallet
    if (address in accounts) return

    const account = await this.getAccount(address)
    await this.services.web3.eth.accounts.wallet.add(account.privateKey)
  }
}

module.exports = LocalWalletProvider
