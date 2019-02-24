import BigNum from 'bn.js';
import {ExitStartedEvent} from '../events';

export interface ExitArgs {
  owner: string;
  id: BigNum;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;
}

export class Exit {
  owner: string;
  id: BigNum;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;
  completed?: boolean;
  finalized?: boolean;

  constructor(args: ExitArgs) {
    this.owner = args.owner;
    this.id = args.id;
    this.token = args.token;
    this.start = args.start;
    this.end = args.end;
    this.block = args.block;
  }
}
