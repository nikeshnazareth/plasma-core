const BaseService = require('./base-service')
const GuardService = require('./guard-service')
const SyncService = require('./sync-service')
const ChainService = require('./chain/chain-service')
const DBService = require('./db/db-service')
const dbInterfaces = require('./db/interfaces/index')
const DBProviders = require('./db/backends/index')
const ContractProviders = require('./contract/index')
const ETHService = require('./eth-service')
const JSONRPCService = require('./jsonrpc/jsonrpc-service')
const OperatorProviders = require('./operator/index')
const ProofService = require('./chain/proof-service')
const WalletProviders = require('./wallet/index')
const Web3Provider = require('./web3-provider')
const EventHandler = require('./contract/events/event-handler')
const EventWatcher = require('./contract/events/event-watcher')

const BaseDBProvider = require('./db/backends/base-provider')
const BaseWalletProvider = require('./wallet/base-provider')

const base = {
  BaseDBProvider,
  BaseWalletProvider
}

module.exports = {
  BaseService,
  GuardService,
  SyncService,
  ChainService,
  DBService,
  dbInterfaces,
  DBProviders,
  ContractProviders,
  ETHService,
  JSONRPCService,
  OperatorProviders,
  ProofService,
  WalletProviders,
  Web3Provider,
  EventHandler,
  EventWatcher,
  base
}
