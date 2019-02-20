/* Services */
const GuardService = require('./guard-service')
const SyncService = require('./sync-service')
const ChainService = require('./chain/chain-service')
const DBService = require('./db/db-service')
const ETHService = require('./eth-service')
const JSONRPCService = require('./jsonrpc/jsonrpc-service')
const ProofService = require('./chain/proof-service')
const EventHandler = require('./events/event-handler')
const EventWatcher = require('./events/event-watcher')

/* Providers */
const DBProviders = require('./db/backends/index')
const ContractProvider = require('./contract/contract-provider')
const OperatorProvider = require('./operator/operator-provider')
const WalletProviders = require('./wallet/index')
const Web3Provider = require('./web3-provider')

/* Database Interfaces */
const dbInterfaces = require('./db/interfaces/index')

/* Base Classes */
const BaseService = require('./base-service')
const BaseDBProvider = require('./db/backends/base-provider')
const BaseWalletProvider = require('./wallet/base-provider')
const BaseOperatorProvider = require('./operator/base-provider')
const BaseContractProvider = require('./contract/base-provider')

const base = {
  BaseService,
  BaseDBProvider,
  BaseWalletProvider,
  BaseOperatorProvider,
  BaseContractProvider
}

module.exports = {
  /* Services */
  GuardService,
  SyncService,
  ChainService,
  DBService,
  ETHService,
  JSONRPCService,
  ProofService,
  EventHandler,
  EventWatcher,

  /* Providers */
  DBProviders,
  ContractProvider,
  OperatorProvider,
  WalletProviders,
  Web3Provider,

  /* Database Interfaces */
  dbInterfaces,

  /* Base Classes */
  base
}
