import AsyncLock from 'async-lock'
import BigNum from 'bn.js'

import { BaseService, ServiceOptions } from '../base-service'
import { Exit, TransactionProof } from '../models/chain'
import { StateObject } from '../models/chain/state-object'
import { Transaction } from '../models/chain/transaction'
import { SnapshotManager } from './snapshot-manager'

interface Balances {
  [key: string]: BigNum
}

export class ChainService extends BaseService {
  private lock = new AsyncLock()

  constructor(options: ServiceOptions) {
    super(options)
  }

  get dependencies(): string[] {
    return ['eth', 'operator', 'chaindb', 'proof']
  }

  /**
   * Adds deposit records to the database.
   * @param deposits Deposits to add.
   */
  public async addDeposits(deposits: StateObject[]): Promise<void> {
    // Filter out any ranges that have already been exited.
    const isNotExited = await Promise.all(
      deposits.map(async (deposit) => {
        return !(await this.services.chaindb.checkExited(deposit))
      })
    )
    deposits = deposits.filter((_, i) => isNotExited[i])

    // Add the deposit to the head state.
    await this.lock.acquire('state', async () => {
      const stateManager = await this.loadState()
      for (const deposit of deposits) {
        stateManager.applyDeposit(deposit)
      }
      await this.saveState(stateManager)
    })

    // Add exitable ends to database.
    const ends = deposits.map((deposit) => {
      return deposit.end
    })
    await this.services.chaindb.addExitableEnds(ends)

    for (const deposit of deposits) {
      this.log(
        `Added deposit to database: ${deposit.owner}, ${deposit.amount}, [${
          deposit.token
        }]`
      )
    }
  }

  /**
   * Returns the list of known exits for an address
   * along with its status (challenge period completed, exit finalized).
   * This method makes contract calls and is therefore slower than `getExits`.
   * @param address Address to query.
   * @returns a list of known exits.
   */
  public async getExitsWithStatus(address: string): Promise<Exit[]> {
    const exits = await this.services.chaindb.getExits(address)

    const currentBlock = await this.services.eth.getCurrentBlock()
    // const challengePeriod = await
    // this.services.eth.contract.getChallengePeriod()
    const challengePeriod = 20

    for (const exit of exits) {
      exit.completed = exit.block.addn(challengePeriod).ltn(currentBlock)
      exit.finalized = await this.services.chaindb.checkFinalized(exit)
    }

    return exits
  }

  /**
   * Adds an exit to the database.
   * @param exit Exit to add to database.
   */
  public async addExit(exit: Exit): Promise<void> {
    await this.services.chaindb.addExit(exit)

    await this.lock.acquire('state', async () => {
      const stateManager = await this.loadState()
      stateManager.applyExit(exit)
      await this.saveState(stateManager)
    })
  }

  /**
   * Attempts to finalized exits for a user.
   * @param address Address to finalize exits for.
   * @returns the transaction hashes for each finalization.
   */
  public async finalizeExits(address: string): Promise<string[]> {
    const exits = await this.getExitsWithStatus(address)
    const completed = exits.filter((exit) => {
      return exit.completed && !exit.finalized
    })

    const finalized = []
    const finalizedTxHashes = []
    for (const exit of completed) {
      try {
        const exitableEnd = await this.services.chaindb.getExitableEnd(exit.end)
        const finalizeTx = await this.services.eth.contract.finalizeExit(
          exit.id.toString(10),
          exitableEnd,
          address
        )
        finalizedTxHashes.push(finalizeTx.transactionHash)
        finalized.push(exit)
      } catch (err) {
        this.log(`ERROR: ${err}`)
      }
    }

    return finalizedTxHashes
  }

  /**
   * Adds a new transaction to a history if it's valid.
   * @param transaction A Transaction object.
   * @param deposits A list of deposits for the transaction.
   * @param proof A Proof object.
   */
  public async addTransaction(
    tx: Transaction,
    proof: TransactionProof
  ): Promise<void> {
    this.log(`Verifying transaction proof for: ${tx.hash}`)
    let tempManager: SnapshotManager
    try {
      tempManager = await this.services.proof.applyProof(tx, proof)
    } catch (err) {
      this.log(`ERROR: Rejecting transaction proof for: ${tx.hash}`)
      throw new Error(`Invalid transaction proof: ${err}`)
    }
    this.log(`Verified transaction proof for: ${tx.hash}`)

    // Merge and save the new head state.
    this.log(`Saving head state for: ${tx.hash}`)
    await this.lock.acquire('state', async () => {
      const stateManager = await this.loadState()
      stateManager.merge(tempManager)
      this.saveState(stateManager)
    })
    this.log(`Saved head state for: ${tx.hash}`)

    // Store the transaction.
    this.log(`Adding transaction to database: ${tx.hash}`)
    await this.services.chaindb.setTransaction(tx)
    this.log(`Added transaction to database: ${tx.hash}`)
  }

  /**
   * Sends a transaction to the operator.
   * @param transaction A signed transaction.
   * @returns the transaction receipt.
   */
  public async sendTransaction(transaction: Transaction): Promise<string> {
    // TODO: Check that the transaction receipt is valid.
    this.log(`Sending transaction to operator: ${transaction.hash}.`)
    const receipt = await this.services.operator.sendTransaction(
      transaction.encoded
    )
    this.log(`Sent transaction to operator: ${transaction.hash}.`)

    return receipt
  }

  /**
   * Loads the current head state as a SnapshotManager.
   * @returns Current head state.
   */
  public async loadState(): Promise<SnapshotManager> {
    const state = await this.services.chaindb.getState()
    return new SnapshotManager({
      snapshots: state,
    })
  }

  /**
   * Saves the current head state from a SnapshotManager.
   * @param stateManager A SnapshotManager.
   */
  public async saveState(stateManager: SnapshotManager): Promise<void> {
    const state = stateManager.state
    await this.services.chaindb.setState(state)
  }
}
