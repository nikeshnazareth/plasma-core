import BigNum from 'bn.js';
import {serialization} from 'plasma-utils';
import {PrettyPrint} from './pretty-print';

interface TransferComponentArgs {
  start: BigNum;
  end: BigNum;
  block: BigNum;
  sender: string;
  recipient: string;
  implicit: boolean;
}

/**
 * Represents an implicit or explicit piece of a transfer.
 */
export class TransferComponent extends PrettyPrint {
  start: BigNum;
  end: BigNum;
  block: BigNum;
  sender: string;
  recipient: string;
  implicit: boolean;

  constructor(component: TransferComponentArgs) {
    super();

    this.start = component.start;
    this.end = component.end;
    this.block = component.block;
    this.sender = component.sender;
    this.recipient = component.recipient;
    this.implicit = component.implicit;
  }

  static fromTransfer(transfer: serialization.models.Transfer):
      TransferComponent {
    if (transfer.block === undefined) {
      throw new Error('Cannot cast to TransferComponent.');
    }

    return new TransferComponent({
      start: new BigNum(transfer.start, 'hex'),
      end: new BigNum(transfer.end, 'hex'),
      block: new BigNum(transfer.block, 'hex'),
      sender: transfer.sender,
      recipient: transfer.recipient,
      implicit: transfer.implicit || false
    });
  }

  static from(args: serialization.models.Transfer): TransferComponent {
    if (args instanceof serialization.models.Transfer) {
      return TransferComponent.fromTransfer(args);
    }

    throw new Error('Cannot cast to TransferComponent.');
  }
}
