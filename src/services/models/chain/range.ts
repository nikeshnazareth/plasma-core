import BigNum from 'bn.js'

import { PrettyPrint } from './pretty-print'
import { Snapshot } from './snapshot'
import { UntypedSnapshot } from './untyped-snapshot'

export interface TypedRange {
  start: BigNum
  end: BigNum
  owner: string
}

export interface UntypedRange extends TypedRange {
  token: BigNum
}

/**
 * Represents a simplified state component ("range").
 */
export class Range extends PrettyPrint {
  /**
   * Creates a Range from a Snapshot.
   * @param snapshot A Snapshot object.
   * @returns the range object.
   */
  public static fromSnapshot(snapshot: Snapshot): Range {
    const untyped = UntypedSnapshot.fromSnapshot(snapshot)
    return new Range(untyped)
  }

  /**
   * Creates a Range from an object.
   * @param args Thing to convert.
   * @returns the range object.
   */
  public static from(args: Snapshot): Range {
    if (args instanceof Snapshot) {
      return Range.fromSnapshot(args)
    }

    throw new Error('Cannot cast to Range.')
  }

  public token: BigNum
  public start: BigNum
  public end: BigNum
  public owner: string

  constructor(range: UntypedRange) {
    super()

    this.token = new BigNum(range.token, 'hex')
    this.start = new BigNum(range.start, 'hex')
    this.end = new BigNum(range.end, 'hex')
    this.owner = range.owner
  }
}
