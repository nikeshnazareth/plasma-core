import BigNum from 'bn.js';
import { EthereumEvent } from '../eth-objects';

interface DepositEventArgs {
  owner: string;
  start: BigNum;
  end: BigNum;
  token: BigNum;
  block: BigNum;
}

export class DepositEvent {
  owner: string;
  start: BigNum;
  end: BigNum;
  token: BigNum;
  block: BigNum;

  constructor (event: DepositEventArgs) {
    this.owner = event.owner;
    this.start = event.start;
    this.end = event.end;
    this.token = event.token;
    this.block = event.block;
  }

  /**
   * @returns the total amount deposited.
   */
  get amount(): BigNum {
    return this.end.sub(this.start);
  }

  /**
   * Creates a DepositEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the DepositEvent object.
   */
  static fromEthereumEvent(event: EthereumEvent): DepositEvent {
    return new DepositEvent({
      owner: event.data.depositer as string,
      start: event.data.untypedStart as BigNum,
      end: event.data.untypedEnd as BigNum,
      token: event.data.tokenType as BigNum,
      block: event.data.plasmaBlockNumber as BigNum
    });
  }

  /**
   * Creates a DepositEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the DepositEvent object.
   */
  static from(args: EthereumEvent): DepositEvent {
    if (args instanceof EthereumEvent) {
      return DepositEvent.fromEthereumEvent(args);
    }

    throw new Error('Cannot cast to DepositEvent.');
  }
}
