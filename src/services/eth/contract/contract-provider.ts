import BigNum from 'bn.js'
import Web3 = require('web3')
import Contract from 'web3/eth/contract'
import { EventLog } from 'web3/types'
import { utils } from 'plasma-utils'
import * as compiledContracts from 'plasma-contracts'
import { ServiceOptions } from '../../base-service'
import { BaseContractProvider } from './base-provider'
import { EthereumTransactionReceipt, EthereumEvent } from '../../models/eth'
import { Deposit } from '../../models/chain'
import { ChainCreatedEvent } from '../../models/events'

const web3Utils = utils.web3Utils

/* Compiled Contracts */
const plasmaChainCompiled = compiledContracts.plasmaChainCompiled
const erc20Compiled = compiledContracts.erc20Compiled
const registryCompiled = compiledContracts.plasmaRegistryCompiled

export interface UserContractOptions {
  registryAddress: string
  plasmaChainName: string
  web3: Web3
}

type ContractOptions = UserContractOptions & ServiceOptions

export class ContractProvider extends BaseContractProvider {
  options!: ContractOptions
  web3: Web3
  contract: Contract
  registry: Contract
  endpoint?: string

  constructor(options: UserContractOptions & ServiceOptions) {
    super(options)

    this.web3 = options.web3
    this.contract = new this.web3.eth.Contract(plasmaChainCompiled.abi)
    this.registry = new this.web3.eth.Contract(
      registryCompiled.abi,
      this.options.registryAddress
    )
  }

  async onStart(): Promise<void> {
    this.initContractInfo()
  }

  get address(): string | null {
    return this.contract.options.address
  }

  get hasAddress(): boolean {
    return this.address !== null
  }

  get ready(): boolean {
    return this.hasAddress && this.endpoint !== undefined
  }

  get plasmaChainName(): string {
    return this.options.plasmaChainName
  }

  async getBlock(block: number): Promise<string> {
    return this.contract.methods.blockHashes(block).call()
  }

  async getNextBlock(): Promise<number> {
    return this.contract.methods.nextPlasmaBlockNumber().call()
  }

  async getCurrentBlock(): Promise<number> {
    const nextBlockNumber = await this.getNextBlock()
    return nextBlockNumber - 1
  }

  async getOperator(): Promise<string> {
    return this.contract.methods.operator().call()
  }

  async getTokenAddress(token: string): Promise<string> {
    if (web3Utils.isAddress(token)) {
      return token
    }
    return this.contract.methods['listings__contractAddress'](
      token.toString()
    ).call()
  }

  async listToken(
    tokenAddress: string,
    sender: string
  ): Promise<EthereumTransactionReceipt> {
    sender = sender || (await this.services.wallet.getAccounts())[0]
    await this.services.wallet.addAccountToWallet(sender)

    const tx = this.contract.methods.listToken(tokenAddress, 0)
    const gas = await tx.estimateGas({ from: sender })
    return tx.send({ from: sender, gas })
  }

  async getChallengePeriod(): Promise<number> {
    return this.contract.methods['CHALLENGE_PERIOD']().call()
  }

  async getTokenId(tokenAddress: string): Promise<string> {
    return this.contract.methods.listed(tokenAddress).call()
  }

  async getPastEvents(
    event: string,
    filter: {} = {}
  ): Promise<EthereumEvent[]> {
    const events: EventLog[] = await this.contract.getPastEvents(event, filter)
    return events.map((event) => {
      return EthereumEvent.from(event)
    })
  }

  async depositValid(deposit: Deposit): Promise<boolean> {
    // Find past deposit events.
    const depositEvents = await this.getPastEvents('DepositEvent', {
      filter: {
        depositer: deposit.owner,
        // block: deposit.block
      },
      fromBlock: 0,
    })

    // Convert the events to deposit objects.
    const deposits = depositEvents.map(Deposit.from)

    // Check that one of the events matches this deposit.
    return deposits.some(deposit.equals)
  }

  async deposit(
    token: BigNum,
    amount: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    await this.services.wallet.addAccountToWallet(owner)

    amount = new BigNum(amount, 'hex')
    if (token.toString() === '0') {
      return this.depositETH(amount, owner)
    } else {
      return this.depositERC20(token, amount, owner)
    }
  }

  /**
   * Deposits an amount of ETH for a user.
   * @param amount Amount to deposit.
   * @param owner Address of the user to deposit for.
   * @returns the deposit transaction receipt.
   */
  async depositETH(
    amount: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    return this.contract.methods
      .depositETH()
      .send({ from: owner, value: amount.toString(10), gas: 150000 })
  }

  /**
   * Deposits an amount of an ERC20 for a user.
   * @param token Token to deposit.
   * @param amount Amount to deposit.
   * @param owner Address of the user to deposit for.
   * @returns the deposit transaction receipt.
   */
  async depositERC20(
    token: BigNum,
    amount: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    const tokenAddress = await this.getTokenAddress(token.toString(10))
    const tokenContract = new this.web3.eth.Contract(
      erc20Compiled.abi,
      tokenAddress
    )
    await tokenContract.methods.approve(this.address, amount).send({
      from: owner,
      gas: 6000000, // TODO: Figure out how much this should be.
    })
    return this.contract.methods.depositERC20(tokenAddress, amount).send({
      from: owner,
      gas: 6000000, // TODO: Figure out how much this should be.
    })
  }

  async startExit(
    block: BigNum,
    token: BigNum,
    start: BigNum,
    end: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    await this.services.wallet.addAccountToWallet(owner)

    return this.contract.methods
      .beginExit(token, block, start, end)
      .send({ from: owner, gas: 200000 })
  }

  async finalizeExit(
    exitId: string,
    exitableEnd: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    await this.services.wallet.addAccountToWallet(owner)

    return this.contract.methods
      .finalizeExit(exitId, exitableEnd)
      .send({ from: owner, gas: 100000 })
  }

  async submitBlock(hash: string): Promise<EthereumTransactionReceipt> {
    const operator = await this.getOperator()
    await this.services.wallet.addAccountToWallet(operator)

    return this.contract.methods.submitBlock(hash).send({ from: operator })
  }

  /**
   * Initializes the contract address and operator endpoint.
   * Queries information from the registry.
   */
  private async initContractInfo() {
    if (!this.plasmaChainName) {
      throw new Error('ERROR: Plasma chain name not provided.')
    }

    const plasmaChainName = web3Utils
      .asciiToHex(this.plasmaChainName)
      .padEnd(66, '0')
    const operator = await this.registry.methods
      .plasmaChainNames(plasmaChainName)
      .call()
    const events = await this.registry.getPastEvents('NewPlasmaChain', {
      filter: { OperatorAddress: operator },
      fromBlock: 0,
    })

    // Parse the events into something useable.
    const parsed = events.map(ChainCreatedEvent.from)

    // Find a matching event.
    const event = parsed.find((event: ChainCreatedEvent) => {
      return event.plasmaChainName === plasmaChainName
    })

    if (!event) {
      throw new Error('ERROR: Plasma chain name not found in registry.')
    }

    // Set the appropriate instance variables.
    this.contract.options.address = event.plasmaChainAddress
    this.endpoint = event.operatorEndpoint

    this.emit('initialized')

    this.log(`Connected to plasma chain: ${this.plasmaChainName}`)
    this.log(`Contract address set: ${this.address}`)
    this.log(`Operator endpoint set: ${this.operatorEndpoint}`)
  }
}
