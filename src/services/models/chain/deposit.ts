import BigNum from 'bn.js'

import { EthereumEvent } from '../eth'
import { DepositEvent } from '../events'
import { OperatorTransfer } from '../operator'

export interface DepositArgs {
  owner: string
  token: BigNum
  start: BigNum
  end: BigNum
  block: BigNum
}

export class Deposit {
  public static fromOperatorTransfer(
    transfer: OperatorTransfer,
    block: string
  ): Deposit {
    return new Deposit({
      block: new BigNum(block, 'hex'),
      end: new BigNum(transfer.end, 'hex'),
      owner: transfer.recipient,
      start: new BigNum(transfer.start, 'hex'),
      token: new BigNum(transfer.token, 'hex'),
    })
  }

  public static fromDepositEvent(event: DepositEvent): Deposit {
    return new Deposit({
      block: event.block,
      end: event.end,
      owner: event.owner,
      start: event.start,
      token: event.token,
    })
  }

  public static fromEthereumEvent(event: EthereumEvent): Deposit {
    const depositEvent = DepositEvent.from(event)
    return Deposit.from(depositEvent)
  }

  public static from(args: DepositEvent | EthereumEvent): Deposit {
    if (args instanceof DepositEvent) {
      return Deposit.fromDepositEvent(args)
    } else if (args instanceof EthereumEvent) {
      return Deposit.fromEthereumEvent(args)
    }
    throw new Error('Cannot cast to Deposit.')
  }

  public owner: string
  public token: BigNum
  public start: BigNum
  public end: BigNum
  public block: BigNum

  constructor(args: DepositArgs) {
    this.owner = args.owner
    this.token = args.token
    this.start = args.start
    this.end = args.end
    this.block = args.block
  }

  get amount(): BigNum {
    return this.end.sub(this.start)
  }

  public equals(other: Deposit): boolean {
    return (
      this.owner === other.owner &&
      this.token.eq(other.token) &&
      this.start.eq(other.token) &&
      this.end.eq(other.end) &&
      this.block.eq(other.block)
    )
  }
}
