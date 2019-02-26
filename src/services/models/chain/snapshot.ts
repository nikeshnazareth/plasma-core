import BigNum from 'bn.js'
import { constants, serialization } from 'plasma-utils'

import { Deposit } from './deposit'
import { Exit } from './exit'
import { PrettyPrint } from './pretty-print'
import { TypedRange } from './range'

const models = serialization.models
const Transfer = models.Transfer

export interface TypedSnapshot extends TypedRange {
  block: BigNum
}

/**
 * Represents a single state component ("snapshot").
 */
export class Snapshot extends PrettyPrint {
  /**
   * Creates a Snapshot from a Transfer.
   * @param transfer A Transfer object.
   * @returns the snapshot object.
   */
  public static fromTransfer(
    transfer: serialization.models.Transfer
  ): Snapshot {
    const serialized = new Transfer(transfer)

    if (
      serialized.typedStart === undefined ||
      serialized.typedEnd === undefined ||
      transfer.block === undefined
    ) {
      throw new Error('Could not create Snapshot from Transfer.')
    }

    return new Snapshot({
      block: transfer.block,
      end: serialized.typedEnd,
      owner: serialized.recipient,
      start: serialized.typedStart,
    })
  }

  /**
   * Creates a Snapshot from a Deposit.
   * @param deposit A Deposit object.
   * @returns the snapshot object.
   */
  public static fromDeposit(deposit: Deposit): Snapshot {
    return new Snapshot({
      ...deposit,
      ...{
        recipient: deposit.owner,
        sender: constants.NULL_ADDRESS,
      },
    })
  }

  /**
   * Creates a Snapshot from an Exit.
   * @param exit An Exit object.
   * @returns the snapshot object.
   */
  public static fromExit(exit: Exit): Snapshot {
    return new Snapshot({
      ...exit,
      ...{
        recipient: constants.NULL_ADDRESS,
        sender: exit.owner,
      },
    })
  }

  public static from(
    args: serialization.models.Transfer | Deposit | Exit
  ): Snapshot {
    if (args instanceof Transfer) {
      return Snapshot.fromTransfer(args)
    } else if (args instanceof Deposit) {
      return Snapshot.fromDeposit(args)
    } else if (args instanceof Exit) {
      return Snapshot.fromExit(args)
    }

    throw new Error('Cannot cast to Snapshot.')
  }

  public start: BigNum
  public end: BigNum
  public block: BigNum
  public owner: string

  constructor(snapshot: TypedSnapshot) {
    super()

    this.start = new BigNum(snapshot.start, 'hex')
    this.end = new BigNum(snapshot.end, 'hex')
    this.block = new BigNum(snapshot.block, 'hex')
    this.owner = snapshot.owner
  }

  /**
   * Determines if the snapshot is valid.
   * @returns `true` if the snapshot is valid, `false` otherwise.
   */
  get valid(): boolean {
    return this.start.lt(this.end) && this.block.gten(0)
  }

  /**
   * Checks if this snapshot equals another.
   * @param other Other snapshot.
   * @returns `true` if the two are equal, `false` otherwise.
   */
  public equals(other: Snapshot): boolean {
    return (
      this.start.eq(other.start) &&
      this.end.eq(other.end) &&
      this.block.eq(other.block) &&
      this.owner === other.owner
    )
  }

  /**
   * Checks if this snapshot contains another.
   * @param other Other snapshot.
   * @returns `true` if this contains the other, `false` otherwise.
   */
  public contains(other: Snapshot): boolean {
    return (
      this.start.lte(other.start) &&
      this.end.gte(other.end) &&
      this.block.eq(other.block) &&
      this.owner === other.owner
    )
  }
}
