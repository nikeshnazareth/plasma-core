import BigNum from 'bn.js'
import { PrettyPrint } from './pretty-print'
import { Snapshot, TypedSnapshot } from './snapshot'

/**
 * Pulls out the token from a typed value.
 * @param typedValue A typed value.
 * @returns the token.
 */
const getTokenFromTyped = (typedValue: BigNum) => {
  const typed = typedValue.toString('hex', 32)
  const token = new BigNum(typed.slice(0, 8), 'hex')
  return token
}

/**
 * Pulls out the value from a typed value.
 * @param typedValue A typed value.
 * @returns the value.
 */
const getValueFromTyped = (typedValue: BigNum) => {
  const typed = typedValue.toString('hex', 32)
  const value = new BigNum(typed.slice(8, 32), 'hex')
  return value
}

/**
 * Version of Snapshot that uses untyped (token/value) values.
 */
export class UntypedSnapshot extends PrettyPrint {
  /**
   * Creates an UntypedSnapshot from a Snapshot.
   * @param snapshot A Snapshot object.
   * @returns the UntypedSnapshot object.
   */
  public static fromSnapshot(snapshot: Snapshot): UntypedSnapshot {
    return new UntypedSnapshot({
      ...snapshot,
      ...{
        end: getValueFromTyped(snapshot.end),
        start: getValueFromTyped(snapshot.start),
        token: getTokenFromTyped(snapshot.start),
      },
    })
  }

  /**
   * Creates an UntypedSnapshot from some other object.
   * @param args Other object to convert..
   * @returns the UntypedSnapshot object.
   */
  public static from(args: Snapshot): UntypedSnapshot {
    if (args instanceof Snapshot) {
      return UntypedSnapshot.fromSnapshot(args)
    }

    throw new Error('Cannot cast to UntypedSnapshot.')
  }

  public token: BigNum
  public start: BigNum
  public end: BigNum
  public block: BigNum
  public owner: string

  constructor(snapshot: TypedSnapshot & { token: BigNum }) {
    super()

    this.token = new BigNum(snapshot.token, 'hex')
    this.start = new BigNum(snapshot.start, 'hex')
    this.end = new BigNum(snapshot.end, 'hex')
    this.block = new BigNum(snapshot.block, 'hex')
    this.owner = snapshot.owner
  }
}
