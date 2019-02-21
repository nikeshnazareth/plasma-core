const BigNum = require('bn.js')
const utils = require('plasma-utils')

/* Compiled Contracts */
const compiledContracts = require('plasma-contracts')
const plasmaChainCompiled = compiledContracts.plasmaChainCompiled
const erc20Compiled = compiledContracts.erc20Compiled
const registryCompiled = compiledContracts.plasmaRegistryCompiled

/* Event Models */
const eventModels = require('../events/event-models')
const DepositEvent = eventModels.DepositEvent
const ChainCreatedEvent = eventModels.ChainCreatedEvent

const BaseContractProvider = require('./base-provider')

const defaultOptions = {
  registryAddress: '0x18d8BD44a01fb8D5f295a2B3Ab15789F26385df7'
}

/**
 * Wraps contract calls for clean access.
 */
class ContractProvider extends BaseContractProvider {
  constructor (options) {
    super(options, defaultOptions)
  }

  get dependencies () {
    return ['web3', 'wallet']
  }

  async _onStart () {
    this._initContract()
    this._initContractInfo()
  }

  /**
   * Returns the current web3 instance.
   * Mainly used for convenience.
   * @return {*} The current web3 instance.
   */
  get web3 () {
    return this.services.web3
  }

  get address () {
    return this.contract.options.address
  }

  get hasAddress () {
    return this.contract && this.address !== null
  }

  get ready () {
    return this.hasAddress && this.operatorEndpoint
  }

  get plasmaChainName () {
    return this.options.plasmaChainName
  }

  /**
   * Checks whether an account is unlocked
   * and attempts to unlock it if not.
   * @param {string} address Address of the account to check.
   */
  async checkAccountUnlocked (address) {
    if (this.services.wallet.addAccountToWallet) {
      await this.services.wallet.addAccountToWallet(address)
    }
  }

  async getBlock (block) {
    return this.contract.methods.blockHashes(block).call()
  }

  async getNextBlock () {
    return this.contract.methods.nextPlasmaBlockNumber().call()
  }

  async getCurrentBlock () {
    const nextBlockNumber = await this.getNextBlock()
    return nextBlockNumber - 1
  }

  async getOperator () {
    return this.contract.methods.operator().call()
  }

  async getTokenAddress (token) {
    if (this.web3.utils.isAddress(token)) {
      return token
    }
    return this.contract.methods['listings__contractAddress'](
      token.toString()
    ).call()
  }

  async listToken (tokenAddress, sender) {
    sender = sender || (await this.services.wallet.getAccounts())[0]
    await this.checkAccountUnlocked(sender)

    const tx = this.contract.methods.listToken(tokenAddress, 0)
    const gas = await tx.estimateGas({ from: sender })
    return tx.send({
      from: sender,
      gas
    })
  }

  async getChallengePeriod () {
    return this.contract.methods['CHALLENGE_PERIOD']().call()
  }

  async getTokenId (tokenAddress) {
    return this.contract.methods.listed(tokenAddress).call()
  }

  async depositValid (deposit) {
    // Find past deposit events.
    const depositEvents = await this.contract.getPastEvents('DepositEvent', {
      filter: {
        depositer: deposit.owner
        // block: deposit.block
      },
      fromBlock: 0
    })

    // Check that one of the events matches this deposit.
    return depositEvents.some((event) => {
      const casted = new DepositEvent(event)
      return (
        casted.owner === deposit.owner &&
        casted.start.eq(deposit.start) &&
        casted.end.eq(deposit.end) &&
        casted.token.eq(deposit.token)
      )
    })
  }

  async deposit (token, amount, owner) {
    if (!this.hasAddress) {
      throw new Error('Plasma chain contract address has not yet been set.')
    }
    await this.checkAccountUnlocked(owner)

    amount = new BigNum(amount, 'hex')
    if (token.toString() === '0') {
      return this.depositETH(amount, owner)
    } else {
      return this.depositERC20(token, amount, owner)
    }
  }

  /**
   * Deposits an amount of ETH for a user.
   * @param {BigNum} amount Amount to deposit.
   * @param {string} owner Address of the user to deposit for.
   * @return {EthereumTransaction} Deposit transaction receipt.
   */
  async depositETH (amount, owner) {
    return this.contract.methods.depositETH().send({
      from: owner,
      value: amount,
      gas: 150000
    })
  }

  /**
   * Deposits an amount of an ERC20 for a user.
   * @param {BigNum} amount Amount to deposit.
   * @param {string} owner Address of the user to deposit for.
   * @return {EthereumTransaction} Deposit transaction receipt.
   */
  async depositERC20 (token, amount, owner) {
    const tokenAddress = await this.getTokenAddress(token)
    const tokenContract = new this.web3.eth.Contract(
      erc20Compiled.abi,
      tokenAddress
    )
    await tokenContract.methods.approve(this.address, amount).send({
      from: owner,
      gas: 6000000 // TODO: Figure out how much this should be.
    })
    return this.contract.methods.depositERC20(tokenAddress, amount).send({
      from: owner,
      gas: 6000000 // TODO: Figure out how much this should be.
    })
  }

  async startExit (block, token, start, end, owner) {
    await this.checkAccountUnlocked(owner)
    return this.contract.methods.beginExit(token, block, start, end).send({
      from: owner,
      gas: 200000
    })
  }

  async finalizeExit (exitId, exitableEnd, owner) {
    await this.checkAccountUnlocked(owner)
    return this.contract.methods.finalizeExit(exitId, exitableEnd).send({
      from: owner,
      gas: 100000
    })
  }

  async submitBlock (hash) {
    const operator = await this.getOperator()
    await this.checkAccountUnlocked(operator)
    return this.contract.methods.submitBlock(hash).send({
      from: operator
    })
  }

  /**
   * Initializes the contract instance.
   */
  _initContract () {
    if (this.contract) return
    this.contract = new this.web3.eth.Contract(plasmaChainCompiled.abi)
    this.registryContract = new this.web3.eth.Contract(
      registryCompiled.abi,
      this.options.registryAddress
    )
  }

  /**
   * Initializes the contract address and operator endpoint.
   * Queries information from the registry.
   */
  async _initContractInfo () {
    if (!this.plasmaChainName) {
      throw new Error('ERROR: Plasma chain name not provided.')
    }

    const plasmaChainName = utils.utils.web3Utils
      .asciiToHex(this.plasmaChainName)
      .padEnd(66, '0')
    const operator = await this.registryContract.methods
      .plasmaChainNames(plasmaChainName)
      .call()
    const events = await this.registryContract.getPastEvents('NewPlasmaChain', {
      filter: {
        OperatorAddress: operator
      },
      fromBlock: 0
    })
    const event = events.find((event) => {
      return event.returnValues.PlasmaChainName === plasmaChainName
    })

    if (!event) {
      throw new Error('ERROR: Plasma chain name not found in registry.')
    }

    const parsed = new ChainCreatedEvent(event)
    this.contract.options.address = parsed.plasmaChainAddress
    this.operatorEndpoint = parsed.operatorEndpoint

    this.emit('initialized')

    this.log(`Connected to plasma chain: ${this.plasmaChainName}`)
    this.log(`Contract address set: ${this.address}`)
    this.log(`Operator endpoint set: ${this.operatorEndpoint}`)
  }
}

module.exports = ContractProvider
