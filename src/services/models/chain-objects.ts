import BigNum from 'bn.js';
import { OperatorTransfer, OperatorProof } from './operator-objects';
import { serialization } from 'plasma-utils';

export class Exit {
  owner: string;
  id: BigNum;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;

  constructor (args: Exit) {
    this.owner = args.owner;
    this.id = args.id;
    this.token = args.token;
    this.start = args.start;
    this.end = args.end;
    this.block = args.block;
  }
}

export class Deposit {
  owner: string;
  token: BigNum;
  start: BigNum;
  end: BigNum;
  block: BigNum;

  constructor(args: Deposit) {
    this.owner = args.owner;
    this.token = args.token;
    this.start = args.start;
    this.end = args.end;
    this.block = args.block;
  }

  static fromOperatorTransfer(transfer: OperatorTransfer, block: string) {
    return new Deposit({
      owner: transfer.recipient,
      token: new BigNum(transfer.token, 'hex'),
      start: new BigNum(transfer.start, 'hex'),
      end: new BigNum(transfer.end, 'hex'),
      block: new BigNum(block, 'hex')
    });
  }
}

export class ProofElement {
  transaction: serialization.models.SignedTransaction;
  transactionProof: serialization.models.TransactionProof;

  constructor(args: ProofElement) {
    this.transaction = args.transaction;
    this.transactionProof = args.transactionProof;
  }

  static fromEmptyProof(block: number) {
    return new ProofElement({
      transaction: new serialization.models.SignedTransaction({
        block: new BigNum(block, 10),
        transfers: []
      }),
      transactionProof: new serialization.models.TransactionProof({
        transferProofs: []
      })
    });
  }

  static fromOperatorProof(proof: OperatorProof) {
    return new ProofElement({
      transaction: new serialization.models.SignedTransaction(proof.transaction),
      transactionProof: new serialization.models.TransactionProof(proof.transactionProof)
    });
  }
}

export interface Proof {
  transaction: any;
  proof: any;
  deposits: any;
}

export interface Block {
  number: number;
  hash: string;
}

export interface Range {
  token: BigNum;
  start: BigNum;
  end: BigNum;
}

export interface Snapshot {
  test: string;
}
