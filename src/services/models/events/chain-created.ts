import { utils } from 'plasma-utils';
import { EthereumEvent } from '../eth-objects';

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
   * Creates a ChainCreatedEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the ChainCreatedEvent object.
   */
  static from(args: EthereumEvent): ChainCreatedEvent {
    if (args instanceof EthereumEvent) {
      return ChainCreatedEvent.fromEthereumEvent(args);
    }

    throw new Error('Cannot cast to ChainCreatedEvent.');
  }
}
