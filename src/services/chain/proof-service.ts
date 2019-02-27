import { PlasmaMerkleSumTree } from 'plasma-utils'

import { BaseService } from '../base-service'
import { StateObject } from '../models/chain/state-object'
import { Transaction } from '../models/chain/transaction'

import { SnapshotManager } from './snapshot-manager'
import { TransactionProof } from '../models/chain'
import { bnMax, bnMin } from '../../utils'

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

    this.log(`Applying proof elements for: ${tx.hash}`)
    const state = new SnapshotManager()
    for (const deposit of deposits) {
      this.applyDeposit(state, deposit)
    }
    for (const transaction of transactions) {
      this.applyTransaction(state, transaction)
    }

    this.log(`Checking validity of: ${tx.hash}`)
    const validTransaction = state.snapshots.some((snapshot) => {
      return snapshot.contains(tx.newState)
    })
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

  /**
   * Applies a deposit to the local state.
   * @param deposit Deposit to apply.
   */
  private applyDeposit(state: SnapshotManager, deposit: StateObject): void {
    state.addSnapshot(deposit)
  }

  /**
   * Applies a transaction to the local state.
   * @param transaction Transaction to apply.
   */
  private applyTransaction(
    state: SnapshotManager,
    transaction: Transaction
  ): void {
    // Each state object explicitly refers to a specific range.
    // However, each object also "implicitly" proves that
    // other ranges *weren't* transferred.
    // Here we break out the object into the explicit
    // and implicit parts.
    const components = this.getStateObjectComponents(transaction.newState)

    for (const component of components) {
      this.applyStateObject(state, component, transaction.witness)
    }
  }

  /**
   * Applies a single TransferComponent to the local state.
   * @param stateObject Component to apply.
   * @param witness Witness that makes the
   */
  private async applyStateObject(
    state: SnapshotManager,
    newState: StateObject,
    witness: string
  ): Promise<void> {
    this.debug(`Applying transaction component: ${newState.prettify()}`)

    // Determine which snapshots overlap with this component.
    const overlapping = state.snapshots.filter((oldState) => {
      return bnMax(oldState.start, newState.start).lt(
        bnMin(oldState.end, newState.end)
      )
    })

    // Apply this component to each snapshot that it overlaps.
    for (const oldState of overlapping) {
      const bytecode = this.predicates[oldState.predicate]
      const valid = await validStateTransition(
        oldState.encode(),
        newState.encode(),
        witness,
        bytecode
      )
      if (!valid) {
        continue
      }

      // Remove the old snapshot.
      state.removeSnapshot(oldState)

      // Insert any newly created snapshots.
      if (oldState.start.lt(newState.start)) {
        state.addSnapshot(
          new StateObject({
            ...oldState,
            ...{
              end: newState.start,
            },
          })
        )
      }
      if (oldState.end.gt(newState.end)) {
        state.addSnapshot(
          new StateObject({
            ...oldState,
            ...{
              start: newState.end,
            },
          })
        )
      }
      state.addSnapshot(
        new StateObject({
          block: newState.block,
          end: bnMin(oldState.end, newState.end),
          predicate: newState.implicit
            ? oldState.predicate
            : newState.predicate,
          start: bnMax(oldState.start, newState.start),
          state: newState.implicit ? oldState.data : newState.data,
        })
      )
    }
  }

  /**
   * Break down the list of TransferComponents that make up a Transfer.
   * @param transfer A Transfer object.
   * @returns a list of TransferComponents.
   */
  private getStateObjectComponents(stateObject: StateObject): StateObject[] {
    const components = []

    if (
      stateObject.implicitStart === undefined ||
      stateObject.implicitEnd === undefined
    ) {
      return [stateObject]
    }

    // Left implicit component.
    if (!stateObject.start.eq(stateObject.implicitStart)) {
      components.push(
        new StateObject({
          ...stateObject,
          ...{
            end: stateObject.start,
            start: stateObject.implicitStart,

            implicit: true,
          },
        })
      )
    }

    // Right implicit component.
    if (!stateObject.end.eq(stateObject.implicitEnd)) {
      components.push(
        new StateObject({
          ...stateObject,
          ...{
            end: stateObject.implicitEnd,
            start: stateObject.end,

            implicit: true,
          },
        })
      )
    }

    // Transfer (non-implicit) component.
    components.push(
      new StateObject({
        ...stateObject,
        ...{
          end: stateObject.end,
          start: stateObject.start,
        },
      })
    )

    return components
  }
}
