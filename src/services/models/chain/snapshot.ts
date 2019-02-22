import BigNum from 'bn.js';
import { serialization, constants } from 'plasma-utils';
import { PrettyPrint } from './pretty-print';
import { Deposit } from './deposit';
import { Exit } from './exit';
import { TypedRange } from './range';

const models = serialization.models;
const Transfer = models.Transfer;

export interface TypedSnapshot extends TypedRange {
  block: BigNum;
}

/**
 * Represents a single state component ("snapshot").
 */
export class Snapshot extends PrettyPrint {
  start: BigNum;
  end: BigNum;
  block: BigNum;
  owner: string;

  constructor (snapshot: TypedSnapshot) {
    super();

    this.start = new BigNum(snapshot.start, 'hex');
    this.end = new BigNum(snapshot.end, 'hex');
    this.block = new BigNum(snapshot.block, 'hex');
    this.owner = snapshot.owner;
  }

  /**
   * Determines if the snapshot is valid.
   * @returns `true` if the snapshot is valid, `false` otherwise.
   */
  get valid(): boolean {
    return this.start.lt(this.end) && this.block.gten(0);
  }

  /**
   * Checks if this snapshot equals another.
   * @param other Other snapshot.
   * @returns `true` if the two are equal, `false` otherwise.
   */
  equals(other: Snapshot): boolean {
    return (
      this.start.eq(other.start) &&
      this.end.eq(other.end) &&
      this.block.eq(other.block) &&
      this.owner === other.owner
    );
  }

  /**
   * Checks if this snapshot contains another.
   * @param other Other snapshot.
   * @returns `true` if this contains the other, `false` otherwise.
   */
  contains(other: Snapshot): boolean {
    return (
      this.start.lte(other.start) &&
      this.end.gte(other.end) &&
      this.block.eq(other.block) &&
      this.owner === other.owner
    );
  }

  /**
   * Creates a Snapshot from a Transfer.
   * @param transfer A Transfer object.
   * @returns the snapshot object.
   */
  static fromTransfer(transfer: serialization.models.Transfer): Snapshot {
    const serialized = new Transfer(transfer);

    if (serialized.typedStart === undefined ||
        serialized.typedEnd === undefined ||
        transfer.block === undefined) {
      throw new Error('Could not create Snapshot from Transfer.');
    }

    return new Snapshot({
      start: serialized.typedStart,
      end: serialized.typedEnd,
      owner: serialized.recipient,
      block: transfer.block
    });
  }

  /**
   * Creates a Snapshot from a Deposit.
   * @param deposit A Deposit object.
   * @returns the snapshot object.
   */
  static fromDeposit(deposit: Deposit): Snapshot {
    return new Snapshot({
      ...deposit,
      ...{
        sender: constants.NULL_ADDRESS,
        recipient: deposit.owner
      }
    });
  }

  /**
   * Creates a Snapshot from an Exit.
   * @param exit An Exit object.
   * @returns the snapshot object.
   */
  static fromExit(exit: Exit): Snapshot {
    return new Snapshot({
      ...exit,
      ...{
        sender: exit.owner,
        recipient: constants.NULL_ADDRESS
      }
    });
  }

  static from(args: serialization.models.Transfer | Deposit | Exit): Snapshot {
    if (args instanceof Transfer) {
      return Snapshot.fromTransfer(args);
    } else if (args instanceof Deposit) {
      return Snapshot.fromDeposit(args);
    } else if (args instanceof Exit) {
      return Snapshot.fromExit(args);
    }

    throw new Error('Cannot cast to Snapshot.');
  }
}
