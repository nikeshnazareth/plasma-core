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

    this.log(`Checking inclusion proofs for: ${tx.hash}`)
    for (const transaction of transactions) {
      const validInclusionProof = await this.checkInclusionProof(transaction)
      if (!validInclusionProof) {
        throw new Error('Invalid transaction')
      }
    }

    this.log(`Getting implicit bounds for: ${tx.hash}`)
    for (let transaction of transactions) {
      transaction = this.setImplicitBounds(transaction)
    }

    const state = new StateManager()

    this.log(`Applying deposits for: ${tx.hash}`)
    for (const deposit of deposits) {
      state.addStateObject(deposit)
    }

    this.log(`Applying transactions for: ${tx.hash}`)
    for (const transaction of transactions) {
      const witness = transaction.witness
      const newState = transaction.newState
      const oldStates = state.getOldStates(newState)

      let validStateObject = true
      for (const oldState of oldStates) {
        const bytecode = await this.getPredicateBytecode(oldState.predicate)
        const valid = await validStateTransition(
          oldState.encode(),
          newState.encode(),
          witness,
          bytecode
        )

        if (!valid) {
          validStateObject = false
          break
        }
      }

      if (validStateObject) {
        state.applyStateObject(newState)
      }
    }

    this.log(`Checking validity of: ${tx.hash}`)
    const validTransaction = state.hasStateObject(tx.newState)
    if (!validTransaction) {
      throw new Error('Invalid state transition')
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
