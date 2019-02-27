import BigNum from 'bn.js'

import { BaseService, ServiceOptions } from '../base-service'
import { EthereumAccount } from '../models/eth'

import {
  BaseContractProvider,
  UserContractOptions,
} from './contract/base-provider'

export interface UserETHProviderOptions extends UserContractOptions {
  ethereumEndpoint?: string
}

interface ETHProviderOptions extends ServiceOptions {
  ethereumEndpoint: string
}

interface DefaultETHProviderOptions {
  ethereumEndpoint: string
}

const defaultOptions: DefaultETHProviderOptions = {
  ethereumEndpoint: 'http://localhost:8545',
}

export class BaseETHProvider extends BaseService {
  public options!: ETHProviderOptions
  public contract: BaseContractProvider

  constructor(options: UserETHProviderOptions & ServiceOptions) {
    super(options, defaultOptions)
    this.contract = new BaseContractProvider(options)
  }

  /**
   * @returns `true` if the node is connected to Ethereum, `false` otherwise.
   */
  public async connected(): Promise<boolean> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Returns the current ETH balance of an address.
   * Queries the main chain, *not* the plasma chain.
   * @param address Address to query.
   * @returns The account's ETH balance.
   */
  public async getBalance(address: string): Promise<BigNum> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * @returns The current ETH block.
   */
  public async getCurrentBlock(): Promise<number> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Returns the addresses of all exposed web3 accounts.
   * @returns the list of addresses.
   */
  public async getAccounts(): Promise<string[]> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * @returns the list of address in the user's wallet.
   */
  public async getWalletAccounts(): Promise<string[]> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Returns the account object for a given account.
   * @param address Address of the account.
   * @returns the account object.
   */
  public async getWalletAccount(address: string): Promise<EthereumAccount> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Checks if the wallet has the given account.
   * @param address Address to check.
   * @returns `true` if the wallet has account, `false` otherwise.
   */
  public async hasWalletAccount(address: string): Promise<boolean> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Adds an account to the user's wallet.
   * @param privateKey the account's private key.
   */
  public async addWalletAccount(privateKey: string): Promise<void> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }

  /**
   * Returns the bytecode for the contract at the given address
   * @param address Contract address.
   * @returns the contract's bytecode.
   */
  public async getContractBytecode(address: string): Promise<string> {
    throw new Error(
      'Classes that extend BaseETHProvider must implement this method.'
    )
  }
}
