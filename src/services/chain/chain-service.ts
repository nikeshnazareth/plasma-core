import AsyncLock from 'async-lock'
import BigNum from 'bn.js'
import { serialization } from 'plasma-utils'

import { BaseService, ServiceOptions } from '../base-service'
import {
  Deposit,
  Exit,
  ProofElement,
  Range,
  UntypedSnapshot,
} from '../models/chain'

import { SnapshotManager } from './snapshot-manager'

const models = serialization.models
const SignedTransaction = models.SignedTransaction

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
   * Returns the balances of an account.
   * @param address Address of the account to query.
   * @returns an object that contains balances.
   */
  public async getBalances(address: string): Promise<Balances> {
    const stateManager = await this.loadState()
    const ranges = stateManager.getOwnedRanges(address)

    const balances: Balances = {}
    for (const range of ranges) {
      const token = range.token.toString(10)

      // Set the balance of this token to zero if it hasn't been seen yet.
      if (!(token in balances)) {
        balances[token] = new BigNum(0)
      }

      // Add the size of this range.
      balances[token] = balances[token].add(range.end.sub(range.start))
    }

    return balances
  }

  /**
   * Adds deposit records to the database.
   * @param deposits Deposits to add.
   */
  public async addDeposits(deposits: Deposit[]): Promise<void> {
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

    await this.services.chaindb.addExitableEnds(deposits)

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
   * Picks the best ranges to use for a transaction.
   * @param address Address sending the transaction.
   * @param token Token being sent.
   * @param amount Amount of the token being sent.
   * @returns the best ranges for the transaction.
   */
  public async pickRanges(
    address: string,
    token: BigNum,
    amount: BigNum
  ): Promise<Range[]> {
    const stateManager = await this.loadState()
    return stateManager.pickRanges(address, token, amount)
  }

  /**
   * Picks the best transfers for an exit.
   * @param address Address sending the transaction.
   * @param token Token being exited.
   * @param amount Amount of the token being exited.
   * @returns the best transfers for the exit.
   */
  public async pickTransfers(
    address: string,
    token: BigNum,
    amount: BigNum
  ): Promise<UntypedSnapshot[]> {
    const stateManager = await this.loadState()
    return stateManager.pickSnapshots(address, token, amount)
  }

  /**
   * Attempts to start exits for a user.
   * @param {string} address Address starting the exit.
   * @param {BigNum} token Token being exited.
   * @param {BigNum} amount Amount of the token being exited.
   * @returns the transaction hashes for each exit.
   */
  public async startExit(
    address: string,
    token: BigNum,
    amount: BigNum
  ): Promise<string[]> {
    const transfers = await this.pickTransfers(address, token, amount)

    const exited = []
    const exitTxHashes = []
    for (const transfer of transfers) {
      try {
        const exitTx = await this.services.eth.contract.startExit(
          transfer.block,
          transfer.token,
          transfer.start,
          transfer.end,
          address
        )
        exitTxHashes.push(exitTx.transactionHash)
        exited.push(transfer)
      } catch (err) {
        this.log(`ERROR: ${err}`)
      }
    }

    return exitTxHashes
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
        const exitableEnd = await this.services.chaindb.getExitableEnd(
          exit.token,
          exit.end
        )
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
    transaction: serialization.models.SignedTransaction,
    deposits: Deposit[],
    proof: ProofElement[]
  ): Promise<void> {
    const tx = new SignedTransaction(transaction)

    this.log(`Verifying transaction proof for: ${tx.hash}`)
    if (!(await this.services.proof.checkProof(tx, deposits, proof))) {
      this.log(`ERROR: Rejecting transaction proof for: ${tx.hash}`)
      throw new Error('Invalid transaction proof')
    }
    this.log(`Verified transaction proof for: ${tx.hash}`)

    // Calculate the new state.
    this.log(`Computing new verified state for: ${tx.hash}`)
    const tempManager = new SnapshotManager()
    this.services.proof.applyProof(tempManager, deposits, proof)
    this.log(`Computed new verified state for: ${tx.hash}`)

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
  public async sendTransaction(
    transaction: serialization.models.SignedTransaction
  ): Promise<string> {
    // TODO: Check that the transaction receipt is valid.
    this.log(`Sending transaction to operator: ${transaction.hash}.`)
    const receipt = await this.services.operator.sendTransaction(
      transaction.encoded
    )
    this.log(`Sent transaction to operator: ${transaction.hash}.`)

    // TODO: Remove this once the operator has an API for send transactions.
    this.log(`Adding transaction to database: ${transaction.hash}`)
    await this.lock.acquire('state', async () => {
      const stateManager = await this.loadState()
      stateManager.applySentTransaction(transaction)
      this.saveState(stateManager)
    })
    await this.services.chaindb.setTransaction(transaction)
    this.log(`Added transaction to database: ${transaction.hash}.`)

    return receipt
  }

  /**
   * Loads the current head state as a SnapshotManager.
   * @returns Current head state.
   */
  public async loadState(): Promise<SnapshotManager> {
    const state = await this.services.chaindb.getState()
    return new SnapshotManager(state)
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
