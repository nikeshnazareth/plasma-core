import BigNum from 'bn.js'
import { ethers } from 'ethers'
import { PrettyPrint } from './pretty-print'

interface StateObjectData {
  start: BigNum
  end: BigNum
  block: BigNum
  predicate: string
  state: string
}

export class StateObject extends PrettyPrint {
  public start: BigNum
  public end: BigNum
  public block: BigNum
  public predicate: string
  public state: string
  public implicit?: boolean
  public implicitStart?: BigNum
  public implicitEnd?: BigNum

  constructor(args: StateObjectData) {
    super()

    this.start = args.start
    this.end = args.end
    this.block = args.block
    this.predicate = args.predicate
    this.state = args.state
  }

  public encode(): string {
    const abi = new ethers.utils.AbiCoder()
    const types = ['uint256', 'uint256', 'uint256', 'address', 'bytes']
    const values = [
      this.start,
      this.end,
      this.block,
      this.predicate,
      this.state,
    ]
    return abi.encode(types, values)
  }

  public equals(other: StateObject): boolean {
    return (
      this.start.eq(other.start) &&
      this.end.eq(other.end) &&
      this.block.eq(other.block) &&
      this.predicate === other.predicate &&
      this.state === other.state
    )
  }
}
