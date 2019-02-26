import * as services from '.'

export interface AppServices {
  [key: string]: services.BaseService

  /* Providers */
  operator: services.BaseOperatorProvider
  eth: services.BaseETHProvider
  wallet: services.BaseWalletProvider

  /* Services */
  guard: services.GuardService
  sync: services.SyncService
  dbservice: services.DBService
  eventHandler: services.EventHandler
  eventWatcher: services.EventWatcher
  proof: services.ProofService
  chain: services.ChainService
  jsonrpc: services.JSONRPCService

  /* Database Interfaces */
  chaindb: services.ChainDB
  walletdb: services.WalletDB
  syncdb: services.SyncDB
}

/**
 * Services that are required for the app to function.
 */
export interface RequiredServiceTypes {
  [key: string]: typeof services.BaseService

  /* Providers */
  operator: typeof services.BaseOperatorProvider
  eth: typeof services.BaseETHProvider
  wallet: typeof services.BaseWalletProvider

  /* Services */
  guard: typeof services.GuardService
  sync: typeof services.SyncService
  dbservice: typeof services.DBService
  eventHandler: typeof services.EventHandler
  eventWatcher: typeof services.EventWatcher
  proof: typeof services.ProofService
  chain: typeof services.ChainService
  jsonrpc: typeof services.JSONRPCService

  /* Database Interfaces */
  chaindb: typeof services.ChainDB
  walletdb: typeof services.WalletDB
  syncdb: typeof services.SyncDB
}
