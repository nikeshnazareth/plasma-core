const BigNum = require('bn.js')
const utils = require('plasma-utils')
const AsyncLock = require('async-lock')

const utilModels = utils.serialization.models
const models = require('./models')
const Exit = models.Exit
const Deposit = models.Deposit
const SignedTransaction = utilModels.SignedTransaction

const BaseService = require('../base-service')

/**
 * Handles chain-related DB calls.
 */
class ChainDB extends BaseService {
  constructor (options) {
    super(options)
    this.lock = new AsyncLock()
  }

  get name () {
    return 'chaindb'
  }

  get dependencies () {
    return ['contract', 'db']
  }

  async _onStart () {
    if (this.services.contract.hasAddress) {
      await this._open()
    } else {
      await new Promise((resolve) => {
        this.services.contract.on('initialized', async () => {
          await this._open()
          resolve()
        })
      })
    }
  }

  async _open () {
    const address = this.services.contract.address
    await this.services.db.open('chain', { id: address })
  }

  /**
   * Queries a transaction.
   * @param {string} hash Hash of the transaction.
   * @return {SignedTransaction} The transaction object.
   */
  async getTransaction (hash) {
    const encoded = await this.services.db.chain.get(
      `transaction:${hash}`,
      null
    )
    return encoded === null ? null : new SignedTransaction(encoded)
  }

  /**
   * Adds a transaction to the database.
   * @param {SignedTransaction} transaction Transaction to store.
   */
  async setTransaction (transaction) {
    await this.services.db.chain.set(
      `transaction:${transaction.hash}`,
      transaction.encoded
    )
  }

  /**
   * Temporary method for storing proofs.
   * @param {string} hash Hash of the transaction.
   * @param {Proof} proof A Proof object to store.
   */
  async setTransactionProof (hash, proof) {
    await this.services.db.chain.set(`proof:${hash}`, proof)
  }

  /**
   * Checks if the chain has stored a specific transaction already.
   * @param {string} hash The transaction hash.
   * @return {boolean} `true` if the chain has stored the transaction, `false` otherwise.
   */
  async hasTransaction (hash) {
    return this.services.db.chain.exists(`transaction:${hash}`)
  }

  /**
   * Returns the number of the last known block.
   * @return {number} Latest block.
   */
  async getLatestBlock () {
    return this.services.db.chain.get('latestblock', -1)
  }

  /**
   * Sets the latest block, if it really is the latest.
   * @param {number} block A block number.
   */
  async setLatestBlock (block) {
    return this.lock.acquire('latestblock', async () => {
      const latest = await this.getLatestBlock()
      if (block > latest) {
        await this.services.db.chain.set('latestblock', block)
      }
    })
  }

  /**
   * Queries a block header by number.
   * @param {number} block Number of the block to query.
   * @return {string} Header of the specified block.
   */
  async getBlockHeader (block) {
    return this.services.db.chain.get(`header:${block}`, null)
  }

  /**
   * Adds a block header to the database.
   * @param {number} block Number of the block to add.
   * @param {string} hash Hash of the given block.
   */
  async addBlockHeader (block, hash) {
    await this.setLatestBlock(block)
    await this.services.db.chain.set(`header:${block}`, hash)
  }

  /**
   * Adds multiple block headers to the database.
   * @param {Array<Block>} blocks An array of block objects.
   */
  async addBlockHeaders (blocks) {
    // Set the latest block.
    const latest = blocks.reduce((a, b) => {
      return a.number > b.number ? a : b
    })
    await this.setLatestBlock(latest.number)

    const objects = blocks.map((block) => {
      return {
        key: `header:${block.number}`,
        value: block.hash
      }
    })
    await this.services.db.chain.bulkPut(objects)
  }

  /**
   * Returns a list of known deposits for an address.
   * @param {string} address Address to query.
   * @return {Array<Deposit>} List of known deposits.
   */
  async getDeposits (address) {
    const deposits = await this.services.db.chain.get(`deposits:${address}`, [])
    return deposits.map((deposit) => {
      return new Deposit(deposit)
    })
  }

  /**
   * Returns the list of known exits for an address.
   * @param {string} address Address to query.
   * @return {Array<Exit>} List of known exits.
   */
  async getExits (address) {
    const exits = await this.services.db.chain.get(`exits:${address}`, [])
    return exits.map((exit) => {
      return new Exit(exit)
    })
  }

  /**
   * Adds an exit to the database.
   * @param {Exit} exit Exit to add to database.
   */
  async addExit (exit) {
    await this.markExited(exit)
    await this._dbArrayPush(`exits:${exit.exiter}`, exit)
  }

  /**
   * Adds an "exitable end" to the database.
   * For more information, see: https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param {BigNum} token Token of the range.
   * @param {BigNum} end End of the range.
   */
  async addExitableEnd (token, end) {
    await this.addExitableEnds([
      {
        token: token,
        end: end
      }
    ])

    this.log(`Added exitable end to database: ${token}:${end}`)
  }

  /**
   * Adds multiple "exitable ends" to the database in bulk.
   * For more information, see: https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param {*} exitable Ends to add to the database.
   */
  async addExitableEnds (exitables) {
    const objects = exitables.map((exitable) => {
      const token = new BigNum(exitable.token, 'hex')
      const end = new BigNum(exitable.end, 'hex')

      const key = this.getTypedValue(token, end)
      return {
        key: `exitable:${key}`,
        value: end.toString('hex')
      }
    })

    await this.services.db.chain.bulkPut(objects)
  }

  /**
   * Returns the correct exitable end for a range.
   * @param {BigNum} token Token of the range.
   * @param {BigNum} end End of the range.
   * @return {BigNum} The exitable end.
   */
  async getExitableEnd (token, end) {
    const startKey = this.getTypedValue(token, end)
    const nextKey = await this.services.db.chain.findNextKey(
      `exitable:${startKey}`
    )
    const exitableEnd = await this.services.db.chain.get(nextKey)
    return new BigNum(exitableEnd, 'hex')
  }

  /**
   * Marks a range as exited.
   * @param {Range} range Range to mark.
   */
  async markExited (range) {
    await this.services.db.chain.set(
      `exited:${range.token}:${range.start}:${range.end}`,
      true
    )
  }

  /**
   * Checks if a range is marked as exited.
   * @param {Range} range Range to check.
   * @return {boolean} `true` if the range is exited, `false` otherwise.
   */
  async checkExited (range) {
    return this.services.db.chain.get(
      `exited:${range.token}:${range.start}:${range.end}`,
      false
    )
  }

  /**
   * Marks an exit as finalized.
   * @param {Exit} exit Exit to mark.
   */
  async markFinalized (exit) {
    await this.services.db.chain.set(
      `finalized:${exit.token}:${exit.start}:${exit.end}`,
      true
    )
  }

  /**
   * Checks if an exit is marked as finalized.
   * @param {Exit} exit Exit to check.
   * @return {boolean} `true` if the exit is finalized, `false` otherwise.
   */
  async checkFinalized (exit) {
    return this.services.db.chain.get(
      `finalized:${exit.token}:${exit.start}:${exit.end}`,
      false
    )
  }

  /**
   * Returns the latest state.
   * @return {Array<Snapshot>} A list of snapshots.
   */
  async getState () {
    return this.services.db.chain.get(`state:latest`, [])
  }

  /**
   * Sets the latest state.
   * @param {Array<Snapshot>} state A list of snapshots.
   */
  async setState (state) {
    await this.services.db.chain.set('state:latest', state)
  }

  /**
   * Returns the "typed" version of a start or end.
   * @param {BigNum} token The token ID.
   * @param {BigNum} value The value to type.
   * @return {string} The typed value.
   */
  getTypedValue (token, value) {
    return new BigNum(
      token.toString('hex', 8) + value.toString('hex', 24),
      'hex'
    ).toString('hex', 32)
  }

  /**
   * Helper function for pushing to an array stored at a key in the database.
   * @param {string} key The key at which the array is stored.
   * @param {*} value Value to add to the array.
   */
  async _dbArrayPush (key, value) {
    return this.lock.acquire(key, async () => {
      const current = await this.services.db.chain.get(key, [])
      current.push(value)
      await this.services.db.chain.set(key, current)
    })
  }
}

module.exports = ChainDB
