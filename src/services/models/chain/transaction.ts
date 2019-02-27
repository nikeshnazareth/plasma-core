import { ethers } from 'ethers'

import { StateObject } from './state-object'

interface TransactionArgs {
  block: number
  inclusionProof: string[]
  witness: string
  newState: StateObject
}

const ABI_TYPES = ['uint256', 'bytes[]', 'bytes', 'bytes']

export class Transaction {
  public static fromEncoded(encoded: string): Transaction {
    const abi = new ethers.utils.AbiCoder()
    const decoded = abi.decode(ABI_TYPES, encoded)
    return new Transaction({
      block: decoded[0],
      inclusionProof: decoded[1],
      witness: decoded[2],
      newState: decoded[3],
    })
  }

  public block: number
  public inclusionProof: string[]
  public witness: string
  public newState: StateObject

  constructor(args: TransactionArgs) {
    this.block = args.block
    this.inclusionProof = args.inclusionProof
    this.witness = args.witness
    this.newState = args.newState
  }

  get hash(): string {
    return ethers.utils.keccak256(this.encoded)
  }

  get encoded(): string {
    const abi = new ethers.utils.AbiCoder()
    return abi.encode(ABI_TYPES, [
      this.block,
      this.inclusionProof,
      this.witness,
      this.newState.encode,
    ])
  }
}
