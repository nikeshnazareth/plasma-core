import BigNum from 'bn.js';
import { utils } from 'plasma-utils';

const web3Utils = utils.web3Utils;

/**
 * Parses an Ethereum event.
 * Converts number-like strings into BigNums.
 * @param event An Ethereum event.
 * @returns A parsed event.
 */
const parseEvent = (event: any): any => {
  const parsed = Object.assign({}, event.returnValues);
  for (const key of Object.keys(parsed)) {
    const value = parsed[key];
    if (!isNaN(value) && !web3Utils.isAddress(value)) {
      parsed[key] = new BigNum(value, 10);
    }
  }
  parsed.eventBlockNumber = new BigNum(event.blockNumber, 10);
  return parsed;
};

export class DepositEvent {
  owner: string;
  start: BigNum;
  end: BigNum;
  token: BigNum;
  block: BigNum;

  constructor (event: any) {
    const parsed = parseEvent(event);

    this.owner = parsed.depositer;
    this.start = parsed.untypedStart;
    this.end = parsed.untypedEnd;
    this.token = parsed.tokenType;
    this.block = parsed.plasmaBlockNumber;
  }

  get amount(): BigNum {
    return this.end.sub(this.start);
  }
}

export class BlockSubmittedEvent {
  number: number;
  hash: string;

  constructor (event: any) {
    const unparsed = Object.assign({}, event.returnValues);
    const parsed = parseEvent(event);

    this.number = parsed.blockNumber.toNumber();
    this.hash = unparsed.submittedHash;
  }
}

export class ExitStartedEvent {
  token: BigNum;
  start: BigNum;
  end: BigNum;
  id: BigNum;
  block: BigNum;
  exiter: string;

  constructor (event: any) {
    const parsed = parseEvent(event);

    this.token = parsed.tokenType;
    this.start = parsed.untypedStart;
    this.end = parsed.untypedEnd;
    this.id = parsed.exitID;
    this.block = parsed.eventBlockNumber;
    this.exiter = parsed.exiter;
  }
}

export class ExitFinalizedEvent {
  token: BigNum;
  start: BigNum;
  end: BigNum;
  id: BigNum;

  constructor (event: any) {
    const parsed = parseEvent(event);

    this.token = parsed.tokenType;
    this.start = parsed.untypedStart;
    this.end = parsed.untypedEnd;
    this.id = parsed.exitID;
  }
}

export class ChainCreatedEvent {
  plasmaChainAddress: string;
  plasmaChainName: string;
  operatorEndpoint: string;
  operatorAddress: string;

  constructor (event: any) {
    const unparsed = Object.assign({}, event.returnValues);

    this.plasmaChainAddress = unparsed.PlasmaChainAddress;
    this.plasmaChainName = web3Utils.hexToAscii(unparsed.PlasmaChainName);
    this.operatorEndpoint = encodeURI(
      web3Utils.hexToAscii(unparsed.PlasmaChainIP)
    ).replace(/%00/gi, '');
    this.operatorAddress = unparsed.OperatorAddress;
  }
}
