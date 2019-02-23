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

  static fromExitStarted(event: ExitStartedEvent): Exit {
    return new Exit({
      owner: event.owner,
      id: event.id,
      token: event.token,
      start: event.start,
      end: event.end,
      block: event.block
    });
  }

  static from(args: ExitStartedEvent): Exit {
    if (args instanceof ExitStartedEvent) {
      return Exit.fromExitStarted(args);
    }

    throw new Error('Cannot cast to Exit.');
  }
}
