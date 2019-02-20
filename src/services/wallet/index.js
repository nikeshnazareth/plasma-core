const Web3WalletProvider = require('./web3-provider')
const LocalWalletProvider = require('./local-provider')

module.exports = {
  Web3WalletProvider,
  LocalWalletProvider,
  DefaultWalletProvider: LocalWalletProvider
}
