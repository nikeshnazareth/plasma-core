import BigNum from 'bn.js'

import { Exit } from '../chain'
import { EthereumEvent } from '../eth'

interface ExitStartedEventArgs {
  token: BigNum
  start: BigNum
  end: BigNum
  id: BigNum
  block: BigNum
  owner: string
}

export class ExitStartedEvent {
  token: BigNum
  start: BigNum
  end: BigNum
  id: BigNum
  block: BigNum
  owner: string

  constructor(event: ExitStartedEventArgs) {
    this.token = event.token
    this.start = event.start
    this.end = event.end
    this.id = event.id
    this.block = event.block
    this.owner = event.owner
  }

  /**
   * Converts the event to an exit object.
   * @returns the exit object.
   */
  toExit(): Exit {
    return new Exit({
      owner: this.owner,
      id: this.id,
      token: this.token,
      start: this.start,
      end: this.end,
      block: this.block,
    })
  }

  /**
   * Creates an ExitStartedEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the ExitStartedEvent object.
   */
  static fromEthereumEvent(event: EthereumEvent): ExitStartedEvent {
    return new ExitStartedEvent({
      token: event.data.tokenType as BigNum,
      start: event.data.untypedStart as BigNum,
      end: event.data.untypedEnd as BigNum,
      id: event.data.exitID as BigNum,
      block: event.data.eventBlockNumber as BigNum,
      owner: event.data.exiter as string,
    })
  }

  /**
   * Creates an ExitStartedEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the ExitStartedEvent object.
   */
  static from(args: EthereumEvent): ExitStartedEvent {
    if (args instanceof EthereumEvent) {
      return ExitStartedEvent.fromEthereumEvent(args)
    }

    throw new Error('Cannot cast to ExitStartedEvent.')
  }
}
