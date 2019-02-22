import BigNum from 'bn.js';
import { utils } from 'plasma-utils';
import { EventLog } from 'web3/types';

const web3Utils = utils.web3Utils;

interface RawEventData {
  [key: string]: string | number;
}

interface EventData {
  [key: string]: string | BigNum;
}

/**
 * Parses an Ethereum event.
 * Converts number-like strings into BigNums.
 * @param event An Ethereum event.
 * @returns the parsed event values.
 */
const parseEventValues = (event: EventLog): EventData => {
  const values: RawEventData = Object.assign({}, event.returnValues);
  const parsed: EventData = {};
  for (const key of Object.keys(values)) {
    const value = values[key];
    if (!isNaN(Number(value)) && !web3Utils.isAddress(value)) {
      parsed[key] = new BigNum(value, 10);
    }
  }
  return parsed;
};

/**
 * Checks whether an object is an EventLog.
 * @param data Object to check.
 * @returns `true` if it's an EventLog, `false` otherwise.
 */
export const isEventLog = (data: any): boolean => {
  return (
    data.blockNumber !== undefined &&
    data.returnValues !== undefined &&
    data.transactionHash !== undefined &&
    data.logIndex !== undefined
  );
};

/**
 * Checks whether an object is an EthereumAccount.
 * @param data Object to check.
 * @returns `true` if it's an EthereumAccount, `false` otherwise.
 */
export const isAccount = (data: any): boolean => {
  return (
    data.address !== undefined &&
    data.privateKey !== undefined
  );
};

interface EthereumEventArgs {
  raw: RawEventData;
  data: EventData;
  block: BigNum;
  hash: string;
}

/**
 * Represents an Ethereum event log object.
 */
export class EthereumEvent {
  raw: RawEventData;
  data: EventData;
  block: BigNum;
  hash: string;

  constructor(event: EthereumEventArgs) {
    this.raw = event.raw;
    this.data = event.data;
    this.block = event.block;
    this.hash = event.hash;
  }

  /**
   * Creates an EthereumEvent from an EthereumEvent.
   * @param event The EthereumEvent to cast.
   * @returns the ExitStartedEvent object.
   */
  static fromEventLog(event: EventLog): EthereumEvent {
    return new EthereumEvent({
      block: new BigNum(event.blockNumber, 10),
      raw: Object.assign({}, event.returnValues),
      data: parseEventValues(event),
      hash: web3Utils.sha3(event.transactionHash + event.logIndex),
    });
  }

  /**
   * Creates an EthereumEvent from some arguments.
   * @param args The arguments to cast.
   * @returns the EthereumEvent object.
   */
  static from(args: EventLog): EthereumEvent {
    if (isEventLog(args)) {
      return EthereumEvent.fromEventLog(args);
    }

    throw new Error('Cannot cast to EthereumEvent.');
  }
}

export interface EthereumAccount {
  address: string;
  privateKey: string;
}

export interface EthereumTransactionReceipt {
  transactionHash: string;
}
