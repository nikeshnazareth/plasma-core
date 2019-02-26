import BigNum from 'bn.js'
import { serialization } from 'plasma-utils'

import { BaseService } from '../../base-service'
import {
  Block,
  Deposit,
  DepositArgs,
  Exit,
  ExitArgs,
  Snapshot,
  TypedSnapshot,
  UntypedRange,
} from '../../models/chain'
import { BaseDBProvider } from '../backends/base-provider'

const models = serialization.models
const SignedTransaction = models.SignedTransaction

export class ChainDB extends BaseService {
  get dependencies(): string[] {
    return ['eth', 'dbservice']
  }

  /**
   * @returns the current db instance.
   */
  get db(): BaseDBProvider {
    const db = this.services.dbservice.dbs.chain
    if (db === undefined) {
      throw new Error('ChainDB is not yet initialized.')
    }
    return db
  }

  public async onStart(): Promise<void> {
    if (this.services.eth.contract.hasAddress) {
      await this.open()
    } else {
      await new Promise((resolve) => {
        this.services.eth.contract.on('initialized', async () => {
          await this.open()
          resolve()
        })
      })
    }
  }

  /**
   * Opens the database connection.
   */
  public async open(): Promise<void> {
    const address = this.services.eth.contract.address
    await this.services.dbservice.open('chain', { id: address })
  }

  /**
   * Queries a transaction.
   * @param hash Hash of the transaction.
   * @returns the transaction object.
   */
  public async getTransaction(
    hash: string
  ): Promise<serialization.models.SignedTransaction> {
    const encoded = await this.db.get(`transaction:${hash}`, undefined)
    if (encoded === undefined) {
      throw new Error('Transaction not found in database.')
    }
    return new SignedTransaction(encoded)
  }

  /**
   * Adds a transaction to the database.
   * @param transaction Transaction to store.
   */
  public async setTransaction(
    transaction: serialization.models.SignedTransaction
  ): Promise<void> {
    await this.db.set(`transaction:${transaction.hash}`, transaction.encoded)
  }

  /**
   * Checks if the chain has stored a specific transaction already.
   * @param hash The transaction hash.
   * @returns `true` if the chain has stored the transaction, `false` otherwise.
   */
  public async hasTransaction(hash: string): Promise<boolean> {
    return this.db.exists(`transaction:${hash}`)
  }

  /**
   * Returns the number of the last known block.
   * @returns the latest block.
   */
  public async getLatestBlock(): Promise<number> {
    return (await this.db.get('latestblock', -1)) as number
  }

  /**
   * Sets the latest block.
   * @param block A block number.
   */
  public async setLatestBlock(block: number): Promise<void> {
    await this.db.set('latestblock', block)
  }

  /**
   * Queries a block header by number.
   * @param block Number of the block to query.
   * @returns the hash of the specified block.
   */
  public async getBlockHeader(block: number): Promise<string | null> {
    return (await this.db.get(`header:${block}`, null)) as string | null
  }

  /**
   * Adds a block header to the database.
   * @param block Number of the block to add.
   * @param hash Hash of the given block.
   */
  public async addBlockHeader(block: number, hash: string): Promise<void> {
    await this.setLatestBlock(block)
    await this.db.set(`header:${block}`, hash)
  }

  /**
   * Adds multiple block headers to the database.
   * @param blocks An array of block objects.
   */
  public async addBlockHeaders(blocks: Block[]): Promise<void> {
    // Set the latest block.
    const latest = blocks.reduce((a, b) => {
      return a.number > b.number ? a : b
    })
    await this.setLatestBlock(latest.number)

    const objects = blocks.map((block) => {
      return { key: `header:${block.number}`, value: block.hash }
    })
    await this.db.bulkPut(objects)
  }

  /**
   * Returns a list of known deposits for an address.
   * @param address Address to query.
   * @returns a list of known deposits.
   */
  public async getDeposits(address: string): Promise<Deposit[]> {
    const deposits = (await this.db.get(
      `deposits:${address}`,
      []
    )) as DepositArgs[]
    return deposits.map((deposit) => {
      return new Deposit(deposit)
    })
  }

  /**
   * Returns the list of known exits for an address.
   * @param address Address to query.
   * @returns a list of known exits.
   */
  public async getExits(address: string): Promise<Exit[]> {
    const exits = (await this.db.get(`exits:${address}`, [])) as ExitArgs[]
    return exits.map((exit) => {
      return new Exit(exit)
    })
  }

  /**
   * Adds an exit to the database.
   * @param exit Exit to add to database.
   */
  public async addExit(exit: Exit): Promise<void> {
    await this.markExited(exit)
    await this.db.push(`exits:${exit.owner}`, exit)
  }

  /**
   * Adds an "exitable end" to the database.
   * For more information, see:
   * https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param token Token of the range.
   * @param end End of the range.
   */
  public async addExitableEnd(token: BigNum, end: BigNum): Promise<void> {
    await this.addExitableEnds([{ token, end }])
  }

  /**
   * Adds multiple "exitable ends" to the database in bulk.
   * For more information, see:
   * https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param exitable Ends to add to the database.
   */
  public async addExitableEnds(
    exitables: Array<{ token: BigNum; end: BigNum }>
  ): Promise<void> {
    const objects = exitables.map((exitable) => {
      const key = this.getTypedValue(exitable.token, exitable.end)
      return { key: `exitable:${key}`, value: exitable.end.toString('hex') }
    })

    await this.db.bulkPut(objects)
  }

  /**
   * Returns the correct exitable end for a range.
   * @param token Token of the range.
   * @param end End of the range.
   * @returns the exitable end.
   */
  public async getExitableEnd(token: BigNum, end: BigNum): Promise<BigNum> {
    const startKey = this.getTypedValue(token, end)
    const nextKey = await this.db.findNextKey(`exitable:${startKey}`)
    const exitableEnd = (await this.db.get(nextKey)) as string
    return new BigNum(exitableEnd, 'hex')
  }

  /**
   * Marks a range as exited.
   * @param range Range to mark.
   */
  public async markExited(range: UntypedRange): Promise<void> {
    await this.db.set(`exited:${range.token}:${range.start}:${range.end}`, true)
  }

  /**
   * Checks if a range is marked as exited.
   * @param range Range to check.
   * @returns `true` if the range is exited, `false` otherwise.
   */
  public async checkExited(range: UntypedRange): Promise<boolean> {
    return (await this.db.get(
      `exited:${range.token}:${range.start}:${range.end}`,
      false
    )) as boolean
  }

  /**
   * Marks an exit as finalized.
   * @param exit Exit to mark.
   */
  public async markFinalized(exit: {
    token: BigNum
    start: BigNum
    end: BigNum
  }): Promise<void> {
    await this.db.set(`finalized:${exit.token}:${exit.start}:${exit.end}`, true)
  }

  /**
   * Checks if an exit is marked as finalized.
   * @param exit Exit to check.
   * @returns `true` if the exit is finalized, `false` otherwise.
   */
  public async checkFinalized(exit: Exit): Promise<boolean> {
    return (await this.db.get(
      `finalized:${exit.token}:${exit.start}:${exit.end}`,
      false
    )) as boolean
  }

  /**
   * Returns the latest state.
   * @returns a list of snapshots.
   */
  public async getState(): Promise<Snapshot[]> {
    const snapshots = (await this.db.get(`state:latest`, [])) as TypedSnapshot[]
    return snapshots.map((snapshot) => {
      return new Snapshot(snapshot)
    })
  }

  /**
   * Sets the latest state.
   * @param state A list of snapshots.
   */
  public async setState(state: Snapshot[]): Promise<void> {
    await this.db.set('state:latest', state)
  }

  /**
   * Returns the "typed" version of a start or end.
   * @param token The token ID.
   * @param value The value to type.
   * @returns the typed value.
   */
  public getTypedValue(token: BigNum, value: BigNum): string {
    return new BigNum(
      token.toString('hex', 8) + value.toString('hex', 24),
      'hex'
    ).toString('hex', 32)
  }
}
