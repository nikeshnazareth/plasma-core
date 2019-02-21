import BigNum from 'bn.js';
import { EthereumEvent } from '../eth-objects';

interface ExitFinalizedEventArgs {
  token: BigNum;
  start: BigNum;
  end: BigNum;
  id: BigNum;
}

export class ExitFinalizedEvent {
  token: BigNum;
  start: BigNum;
  end: BigNum;
  id: BigNum;

  constructor (event: ExitFinalizedEventArgs) {
    this.token = event.token;
    this.start = event.start;
    this.end = event.end;
    this.id = event.id;
  }

  /**
   * Creates a ExitFinalizedEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the ExitFinalizedEvent object.
   */
  static fromEthereumEvent(event: EthereumEvent): ExitFinalizedEvent {
    return new ExitFinalizedEvent({
      token: event.data.tokenType as BigNum,
      start: event.data.untypedStart as BigNum,
      end: event.data.untypedEnd as BigNum,
      id: event.data.exitID as BigNum
    });
  }

  /**
   * Creates a ExitFinalizedEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the ExitFinalizedEvent object.
   */
  static from(args: EthereumEvent): ExitFinalizedEvent {
    if (args instanceof EthereumEvent) {
      return ExitFinalizedEvent.fromEthereumEvent(args);
    }

    throw new Error('Cannot cast to ExitFinalizedEvent.');
  }
}
