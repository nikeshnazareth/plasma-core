import BigNum from 'bn.js';
import { PrettyPrint } from './pretty-print';
import { UntypedSnapshot } from './untyped-snapshot';
import { Snapshot } from './snapshot';

export interface TypedRange {
  start: BigNum;
  end: BigNum;
  owner: string;
}

export interface UntypedRange extends TypedRange {
  token: BigNum;
}

/**
 * Represents a simplified state component ("range").
 */
export class Range extends PrettyPrint {
  token: BigNum;
  start: BigNum;
  end: BigNum;
  owner: string;

  constructor(range: UntypedRange) {
    super();

    this.token = new BigNum(range.token, 'hex');
    this.start = new BigNum(range.start, 'hex');
    this.end = new BigNum(range.end, 'hex');
    this.owner = range.owner;
  }

  /**
   * Creates a Range from a Snapshot.
   * @param snapshot A Snapshot object.
   * @returns the range object.
   */
  static fromSnapshot(snapshot: Snapshot): Range {
    const untyped = UntypedSnapshot.fromSnapshot(snapshot);
    return new Range(untyped);
  }

  static from(args: Snapshot): Range {
    if (args instanceof Snapshot) {
      return Range.fromSnapshot(args);
    }

    throw new Error('Cannot cast to Range.');
  }
}
