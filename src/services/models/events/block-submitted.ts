import { EthereumEvent } from '../eth';

interface BlockSubmittedEventArgs {
  number: number;
  hash: string;
}

export class BlockSubmittedEvent {
  number: number;
  hash: string;

  constructor(event: BlockSubmittedEventArgs) {
    this.number = event.number;
    this.hash = event.hash;
  }

  /**
   * Creates a BlockSubmittedEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the BlockSubmittedEvent object.
   */
  static fromEthereumEvent(event: EthereumEvent): BlockSubmittedEvent {
    return new BlockSubmittedEvent({
      number: event.block.toNumber(),
      hash: event.raw.submittedHash as string
    });
  }

  /**
   * Creates a BlockSubmittedEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the BlockSubmittedEvent object.
   */
  static from(args: EthereumEvent): BlockSubmittedEvent {
    if (args instanceof EthereumEvent) {
      return BlockSubmittedEvent.fromEthereumEvent(args);
    }

    throw new Error('Cannot cast to BlockSubmittedEvent.');
  }
}
