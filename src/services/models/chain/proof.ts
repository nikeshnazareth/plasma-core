import BigNum from 'bn.js'
import { serialization } from 'plasma-utils'

import { OperatorProof } from '../operator'

import { Deposit } from './deposit'

export class ProofElement {
  public static fromEmptyProof(block: number) {
    return new ProofElement({
      transaction: new serialization.models.SignedTransaction({
        block: new BigNum(block, 10),
        transfers: [],
      }),
      transactionProof: new serialization.models.TransactionProof({
        transferProofs: [],
      }),
    })
  }

  public static fromOperatorProof(proof: OperatorProof) {
    return new ProofElement({
      transaction: new serialization.models.SignedTransaction(
        proof.transaction
      ),
      transactionProof: new serialization.models.TransactionProof(
        proof.transactionProof
      ),
    })
  }

  public transaction: serialization.models.SignedTransaction
  public transactionProof: serialization.models.TransactionProof

  constructor(args: ProofElement) {
    this.transaction = args.transaction
    this.transactionProof = args.transactionProof
  }
}

export interface Proof {
  transaction: serialization.models.SignedTransaction
  proof: ProofElement[]
  deposits: Deposit[]
}
