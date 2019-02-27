import { PlasmaMerkleSumTree } from 'plasma-utils'

import { BaseService } from '../base-service'
import { StateObject } from '../models/chain/state-object'
import { Transaction } from '../models/chain/transaction'

import { PredicateCache, SnapshotManager } from './snapshot-manager'
import { TransactionProof } from '../models/chain'

const EMPTY_BLOCK_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export class ProofService extends BaseService {
  get dependencies(): string[] {
    return ['eth', 'chaindb']
  }

  /**
   * Checks a transaction proof.
   * @param tx The Transaction to verify.
   * @param deposits A list of deposits.
   * @param transaction Transactions that prove tx is valid.
   * @returns the head state at the end of the transaction if valid.
   */
  public async applyProof(
    tx: Transaction,
    proof: TransactionProof
  ): Promise<SnapshotManager> {
    const deposits = proof.deposits
    const transactions = proof.transactions

    this.log(`Checking validity of deposits for: ${tx.hash}`)
    for (const deposit of deposits) {
      const validDeposit = await this.services.eth.contract.depositValid(
        deposit
      )
      if (!validDeposit) {
        throw new Error('Invalid deposit')
      }
    }

    this.log(`Checking validity of proof elements for: ${tx.hash}`)
    for (const transaction of transactions) {
      const validInclusionProof = await this.checkInclusionProof(transaction)
      if (!validInclusionProof) {
        throw new Error('Invalid transaction')
      }
    }

    this.log(`Loading predicates for: ${tx.hash}`)
    const predicates = await this.loadPredicateBytecode(deposits, transactions)
    const snapshotManager = new SnapshotManager({
      predicates,
    })

    this.log(`Applying proof elements for: ${tx.hash}`)
    for (const deposit of deposits) {
      snapshotManager.applyDeposit(deposit)
    }
    for (const transaction of transactions) {
      snapshotManager.applyTransaction(transaction)
    }

    this.log(`Checking validity of: ${tx.hash}`)
    const validTransaction = snapshotManager.snapshots.some((snapshot) => {
      return snapshot.contains(tx.newState)
    })
    if (!validTransaction) {
      throw new Error('Invalid state transition')
    }

    return snapshotManager
  }

  /**
   * Loads the bytecode for all predicates into a cache.
   * @param deposits Deposits for this proof.
   * @param proof Proof elements.
   * @returns an object that maps predicate addresses to bytecode.
   */
  private async loadPredicateBytecode(
    deposits: StateObject[],
    transactions: Transaction[]
  ): Promise<PredicateCache> {
    // Get a list of all predicates used in this proof.
    const depositPredicates = deposits.map((deposit) => {
      return deposit.predicate
    })
    const transactionPredicates = transactions.map((transaction) => {
      return transaction.newState.predicate
    })

    // Remove any duplicates.
    const predicateAddresses = [
      ...new Set(depositPredicates.concat(transactionPredicates)),
    ]

    const predicates: PredicateCache = {}
    for (const address of predicateAddresses) {
      let bytecode
      try {
        bytecode = await this.services.chaindb.getPredicateBytecode(address)
      } catch {
        // Don't have the bytecode stored, pull it and store it.
        bytecode = await this.services.eth.getContractBytecode(address)
        await this.services.chaindb.setPredicateBytecode(address, bytecode)
      }
      predicates[address] = bytecode
    }

    return predicates
  }

  /**
   * Checks whether a transaction's inclusion proof is valid.
   * @param transaction The transaction to check.
   * @returns `true` if the inclusion proof is valid, `false` otherwise.
   */
  private async checkInclusionProof(transaction: Transaction) {
    let root = await this.services.chaindb.getBlockHeader(transaction.block)
    if (root === null) {
      throw new Error(
        `Received transaction for non-existent block #${transaction.block}`
      )
    }

    root = root + 'ffffffffffffffffffffffffffffffff'

    // Determine the implicit bounds of this leaf.
    const {
      implicitStart,
      implicitEnd,
    } = PlasmaMerkleSumTree.getImplicitBounds(
      transaction.newState.encode(),
      transaction.inclusionProof
    )
    transaction.newState.implicitStart = implicitStart
    transaction.newState.implicitEnd = implicitEnd

    // Return the result of the inclusion proof check.
    return PlasmaMerkleSumTree.checkInclusionProof(
      transaction.newState.encode(),
      transaction.inclusionProof,
      root
    )
  }
}
