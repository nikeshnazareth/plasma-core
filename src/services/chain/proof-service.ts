import { PlasmaMerkleSumTree } from 'plasma-utils'
import { validStateTransition } from 'plasma-verifier'

import { BaseService } from '../base-service'
import { Transaction } from '../models/chain/transaction'
import { TransactionProof } from '../models/chain'
import { StateManager } from './state-manager'

interface PredicateCache {
  [key: string]: string
}

export class ProofService extends BaseService {
  private predicates: PredicateCache = {}

  get dependencies(): string[] {
    return ['eth', 'chaindb']
  }

  /**
   * Checks a transaction proof.
   * @param tx The transaction to verify.
   * @param proof A transaction proof for that transaction.
   * @returns the head state at the end of the transaction if valid.
   */
  public async applyProof(
    tx: Transaction,
    proof: TransactionProof
  ): Promise<StateManager> {
    const state = new StateManager()

    // Apply deposits.
    this.log(`Applying deposits for: ${tx.hash}`)
    for (const deposit of proof.deposits) {
      // Validate the deposit.
      const validDeposit = await this.services.eth.contract.depositValid(
        deposit
      )
      if (!validDeposit) {
        throw new Error('Invalid deposit')
      }

      state.addStateObject(deposit)
    }

    // Apply transactions.
    this.log(`Applying transactions for: ${tx.hash}`)
    for (let transaction of proof.transactions) {
      // Check inclusion proofs.
      const validInclusionProof = await this.checkInclusionProof(transaction)
      if (!validInclusionProof) {
        throw new Error('Invalid transaction inclusion proof')
      }

      // Set implicit bounds.
      transaction = this.setImplicitBounds(transaction)

      const witness = transaction.witness
      const newState = transaction.newState
      const oldStates = state.getOldStates(newState)

      for (const oldState of oldStates) {
        // Validate the state transition using the predicate.
        const bytecode = await this.getPredicateBytecode(oldState.predicate)
        const valid = await validStateTransition(
          oldState.encode(),
          newState.encode(),
          witness,
          bytecode
        )

        // State object is invalid if any transition fails.
        if (!valid) {
          throw new Error('Invalid state transition')
        }
      }

      // Apply the transaction to local state.
      state.applyStateObject(newState)
    }

    // Check that the transaction is in the verified state.
    const validTransaction = state.hasStateObject(tx.newState)
    if (!validTransaction) {
      throw new Error('Invalid transaction')
    }

    return state
  }

  private async getPredicateBytecode(address: string): Promise<string> {
    // Try to pull from cache first.
    if (address in this.predicates) {
      return this.predicates[address]
    }

    let bytecode
    try {
      bytecode = await this.services.chaindb.getPredicateBytecode(address)
    } catch {
      // Don't have the bytecode stored, pull it and store it.
      bytecode = await this.services.eth.getContractBytecode(address)
      await this.services.chaindb.setPredicateBytecode(address, bytecode)
    }

    // Cache the bytecode for later.
    this.predicates[address] = bytecode

    return bytecode
  }

  /**
   * Checks whether a transaction's inclusion proof is valid.
   * @param transaction The transaction to check.
   * @returns `true` if the inclusion proof is valid, `false` otherwise.
   */
  private async checkInclusionProof(
    transaction: Transaction
  ): Promise<boolean> {
    let root = await this.services.chaindb.getBlockHeader(transaction.block)
    if (root === null) {
      throw new Error(
        `Received transaction for non-existent block #${transaction.block}`
      )
    }

    root = root + 'ffffffffffffffffffffffffffffffff'

    // Return the result of the inclusion proof check.
    return PlasmaMerkleSumTree.checkInclusionProof(
      transaction.newState.encode(),
      transaction.inclusionProof,
      root
    )
  }

  /**
   * Sets the implicit bounds for a transaction.
   * @param transaction Transaction to set.
   * @returns the transaction with implicit bounds set.
   */
  private setImplicitBounds(transaction: Transaction): Transaction {
    const {
      implicitStart,
      implicitEnd,
    } = PlasmaMerkleSumTree.getImplicitBounds(
      transaction.newState.encode(),
      transaction.inclusionProof
    )
    transaction.newState.implicitStart = implicitStart
    transaction.newState.implicitEnd = implicitEnd

    return transaction
  }
}
