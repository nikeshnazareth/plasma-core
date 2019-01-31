const BaseService = require('./base-service')

const utils = require('plasma-utils')
const SignedTransaction = utils.serialization.models.SignedTransaction

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

const defaultOptions = {
  transactionPollInterval: 15000
}

/**
 * Handles automatically synchronizing latest history proofs.
 */
class SyncService extends BaseService {
  constructor (options) {
    super(options, defaultOptions)
    this.pending = []
  }

  get name () {
    return 'sync'
  }

  async start () {
    this.started = true

    this.services.contract.on('event:Deposit', this._onDeposit.bind(this))
    this.services.contract.on('event:BlockSubmitted', this._onBlockSubmitted.bind(this))
    this.services.contract.on('event:ExitFinalized', this._onExitFinalized.bind(this))

    this._pollPendingTransactions()
  }

  async stop () {
    this.started = false

    this.removeAllListeners()
  }

  /**
   * Wrapper that handles regularly polling pending transactions.
   */
  async _pollPendingTransactions () {
    if (!this.started) return

    try {
      await this._checkPendingTransactions()
    } finally {
      await utils.utils.sleep(100)
      this._pollPendingTransactions()
    }
  }

  /**
   * Checks for any available pending transactions and emits an event for each.
   */
  async _checkPendingTransactions () {
    if (
      !this.services.operator.online ||
      !this.services.contract.contract ||
      !this.services.contract.contract.options.address
    ) { return }

    const lastSyncedBlock = await this.services.db.get(`sync:block`, -1)
    const firstUnsyncedBlock = lastSyncedBlock + 1
    // TODO: Should this be determined locally? Also, should we store blocks locally?
    const currentBlock = await this.services.chain.getLatestBlock()
    if (firstUnsyncedBlock > currentBlock) return
    this.logger(
      `Checking for new transactions between blocks ${firstUnsyncedBlock} and ${currentBlock}`
    )

    // TODO: Figure out how handle operator errors.
    const addresses = await this.services.wallet.getAccounts()
    for (let address of addresses) {
      this.pending = this.pending.concat(
        await this.services.operator.getTransactions(
          address,
          firstUnsyncedBlock,
          currentBlock
        )
      )
    }

    let failed = []
    for (let i = 0; i < this.pending.length; i++) {
      const tx = this.pending[i]
      try {
        await this.addTransaction(tx)
      } catch (err) {
        failed.push(tx)
        this.logger(`ERROR: ${err}`)
      }
    }
    this.pending = failed

    await this.services.db.set(`sync:block`, currentBlock)
  }

  /**
   * Tries to add any newly received transactions.
   * @param {*} encoded An encoded transaction.
   */
  async addTransaction (encoded) {
    const tx = new SignedTransaction(encoded)

    // TODO: The operator should really be avoiding this.
    if (tx.transfers[0].sender === NULL_ADDRESS) {
      return
    }

    if (await this.services.chain.hasTransaction(tx.hash)) {
      return
    }

    const {
      transaction,
      deposits,
      proof
    } = await this.services.operator.getTransaction(tx.encoded)
    this.logger(`Importing new transaction: ${tx.hash}`)
    await this.services.chain.addTransaction(transaction, deposits, proof)
    this.logger(`Successfully imported transaction: ${tx.hash}`)
  }

  /**
   * Handles adding new deposits for the user.
   * @param {*} event A Deposit event.
   */
  async _onDeposit (event) {
    // TODO: Where should address filtering be done?
    // Probably wherever events are originally watched to reduce total events pulled.
    await this.services.chain.addDeposit(event)
    await this.services.chain.addExitableEnd(event.token, event.end)
  }

  async _onBlockSubmitted (event) {
    await this.services.chain.addBlockHeader(event.number, event.hash)
  }

  async _onExitFinalized (event) {
    await this.services.chain.removeExit(event)
    await this.services.chain.addExitableEnd(event.token, event.start)
  }

  async _onExitStarted (event) {
    try {
      await this.services.rangeManager.removeRanges(event.exiter, event)
    } finally {
      await this.services.chain.addExit(event)
    }
  }
}

module.exports = SyncService
