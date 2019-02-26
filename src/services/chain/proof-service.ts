import { PlasmaMerkleSumTree, serialization } from 'plasma-utils'

import { BaseService } from '../base-service'
import { Deposit, ProofElement } from '../models/chain'

import { SnapshotManager } from './snapshot-manager'

const EMPTY_BLOCK_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export class ProofService extends BaseService {
  get dependencies(): string[] {
    return ['eth', 'chaindb']
  }

  /**
   * Checks a transaction proof.
   * @param transaction A Transaction object.
   * @param deposits A list of deposits.
   * @param proof A Proof object.
   * @returns `true` if the transaction is valid.
   */
  async checkProof(
    transaction: serialization.models.SignedTransaction,
    deposits: Deposit[],
    proof: ProofElement[]
  ): Promise<boolean> {
    this.log(`Checking signatures for: ${transaction.hash}`)
    if (!transaction.checkSigs()) {
      throw new Error('Invalid transaction signatures')
    }

    this.log(`Checking validity of deposits for: ${transaction.hash}`)
    for (const deposit of deposits) {
      if (!(await this.services.eth.contract.depositValid(deposit))) {
        throw new Error('Invalid deposit')
      }
    }

    this.log(`Checking validity of proof elements for: ${transaction.hash}`)
    for (const element of proof) {
      if (
        !(await this.transactionValid(
          element.transaction,
          element.transactionProof
        ))
      ) {
        throw new Error('Invalid transaction')
      }
    }

    this.log(`Applying proof elements for: ${transaction.hash}`)
    const snapshotManager = new SnapshotManager()
    this.applyProof(snapshotManager, deposits, proof)
    if (!snapshotManager.validateTransaction(transaction)) {
      throw new Error('Invalid state transition')
    }

    return true
  }

  /**
   * Applies a transaction proof to a SnapshotManager.
   * @param snapshotManager SnapshotManger to apply to.
   * @param deposits Deposits to apply.
   * @param proof Proof to apply.
   */
  applyProof(
    snapshotManager: SnapshotManager,
    deposits: Deposit[],
    proof: ProofElement[]
  ) {
    for (const deposit of deposits) {
      snapshotManager.applyDeposit(deposit)
    }

    for (const element of proof) {
      const tx = element.transaction
      if (tx.isEmptyBlockTransaction) {
        snapshotManager.applyEmptyBlock(tx.block.toNumber())
      } else {
        snapshotManager.applyTransaction(element.transaction)
      }
    }
  }

  /**
   * Checks whether a transaction is valid.
   * @param transaction An UnsignedTransaction object.
   * @param proof A TransactionProof object.
   * @returns `true` if the transaction is valid, `false` otherwise.
   */
  async transactionValid(
    transaction: serialization.models.UnsignedTransaction,
    proof: serialization.models.TransactionProof
  ) {
    let root = await this.services.chaindb.getBlockHeader(
      transaction.block.toNumber()
    )
    if (root === null) {
      throw new Error(
        `Received transaction for non-existent block #${transaction.block}`
      )
    }

    // If the root is '0x00....', then this block was empty.
    if (root === EMPTY_BLOCK_HASH) {
      if (transaction.transfers.length > 0) {
        this.log(
          `WARNING: Block #${
            transaction.block
          } is empty but received a non-empty proof element. Proof will likely be rejected. This is probably due to an error in the operator.`
        )
      }
      transaction.isEmptyBlockTransaction = true
      return true
    }

    root = root + 'ffffffffffffffffffffffffffffffff'

    // Hack for now, make sure that all other transactions aren't fake.
    transaction.isEmptyBlockTransaction = false
    transaction.transfers.forEach((transfer, i) => {
      const {
        implicitStart,
        implicitEnd,
      } = PlasmaMerkleSumTree.getTransferProofBounds(
        transaction,
        proof.transferProofs[i]
      )
      transfer.implicitStart = implicitStart
      transfer.implicitEnd = implicitEnd
    })

    return PlasmaMerkleSumTree.checkTransactionProof(transaction, proof, root)
  }
}
