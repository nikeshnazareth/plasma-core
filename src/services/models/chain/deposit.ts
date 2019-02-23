import BigNum from 'bn.js';

import {EthereumEvent} from '../eth';
import {DepositEvent} from '../events';
import {OperatorTransfer} from '../operator';

export interface DepositArgs {
  owner: string;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;
}

export class Deposit {
  owner: string;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;

  constructor(args: DepositArgs) {
    this.owner = args.owner;
    this.token = args.token;
    this.start = args.start;
    this.end = args.end;
    this.block = args.block;
  }

  get amount(): BigNum {
    return this.end.sub(this.start);
  }

  equals(other: Deposit): boolean {
    return (
        this.owner === other.owner && this.token.eq(other.token) &&
        this.start.eq(other.token) && this.end.eq(other.end) &&
        this.block.eq(other.block));
  }

  static fromOperatorTransfer(transfer: OperatorTransfer, block: string):
      Deposit {
    return new Deposit({
      owner: transfer.recipient,
      token: new BigNum(transfer.token, 'hex'),
      start: new BigNum(transfer.start, 'hex'),
      end: new BigNum(transfer.end, 'hex'),
      block: new BigNum(block, 'hex')
    });
  }

  static fromDepositEvent(event: DepositEvent): Deposit {
    return new Deposit({
      owner: event.owner,
      token: event.token,
      start: event.start,
      end: event.end,
      block: event.block
    });
  }

  static fromEthereumEvent(event: EthereumEvent): Deposit {
    const depositEvent = DepositEvent.from(event);
    return Deposit.from(depositEvent);
  }

  static from(args: DepositEvent|EthereumEvent): Deposit {
    if (args instanceof DepositEvent) {
      return Deposit.fromDepositEvent(args);
    } else if (args instanceof EthereumEvent) {
      return Deposit.fromEthereumEvent(args);
    }
    throw new Error('Cannot cast to Deposit.');
  }
}
