import { utils } from 'plasma-utils';
import { EthereumEvent, isEventLog } from '../eth-objects';
import { EventLog } from 'web3/types';

const web3Utils = utils.web3Utils;

interface ChainCreatedEventArgs {
  plasmaChainAddress: string;
  plasmaChainName: string;
  operatorEndpoint: string;
  operatorAddress: string;
}

export class ChainCreatedEvent {
  plasmaChainAddress: string;
  plasmaChainName: string;
  operatorEndpoint: string;
  operatorAddress: string;

  constructor(event: ChainCreatedEventArgs) {
    this.plasmaChainAddress = event.plasmaChainAddress;
    this.plasmaChainName = event.plasmaChainName;
    this.operatorEndpoint = event.operatorEndpoint;
    this.operatorAddress = event.operatorAddress;
  }

  /**
   * Creates a ChainCreatedEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the ChainCreatedEvent object.
   */
  static fromEthereumEvent(event: EthereumEvent): ChainCreatedEvent {
    return new ChainCreatedEvent({
      plasmaChainAddress: event.raw.PlasmaChainAddress as string,
      plasmaChainName: web3Utils.hexToAscii(event.raw.PlasmaChainName),
      operatorEndpoint: encodeURI(
        web3Utils.hexToAscii(event.raw.PlasmaChainIP)
      ).replace(/%00/gi, ''),
      operatorAddress: event.raw.OperatorAddress as string
    });
  }

  /**
   * Creates a ChainCreatedEvent from an EventLog.
   * @param event The EventLog to cast.
   * @returns the ChainCreatedEvent object.
   */
  static fromEventLog(event: EventLog): ChainCreatedEvent {
    const ethereumEvent = EthereumEvent.from(event);
    return ChainCreatedEvent.from(ethereumEvent);
  }

  /**
   * Creates a ChainCreatedEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the ChainCreatedEvent object.
   */
  static from(args: EthereumEvent | EventLog): ChainCreatedEvent {
    if (args instanceof EthereumEvent) {
      return ChainCreatedEvent.fromEthereumEvent(args);
    } else if (isEventLog(args)) {
      return ChainCreatedEvent.fromEventLog(args);
    }

    throw new Error('Cannot cast to ChainCreatedEvent.');
  }
}
