import BigNum from 'bn.js';
import {serialization} from 'plasma-utils';
import {PrettyPrint} from './pretty-print';

/**
 * Checks whether an object looks like a Transfer.
 * @param value Object to check.
 * @returns `true` if the object looks like a Transfer, `false` otherwise.
 */
const isTransferLike = (value: serialization.models.Transfer): boolean => {
  return (
      value.sender !== undefined && value.recipient !== undefined &&
          BigNum.isBN(value.token),
      BigNum.isBN(value.start), BigNum.isBN(value.end),
      BigNum.isBN(value.block), BigNum.isBN(value.implicitStart),
      BigNum.isBN(value.implicitEnd));
};

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

  /**
   * Creates a TransferComponent from a Transfer.
   * @param transfer Transfer to convert.
   * @returns the TransferComponent.
   */
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

  /**
   * Creates a TransferComponent from a Transfer.
   * @param args Transfer to convert.
   * @returns the TransferComponent.
   */
  static from(args: serialization.models.Transfer): TransferComponent {
    if (isTransferLike(args)) {
      return TransferComponent.fromTransfer(args);
    }

    throw new Error('Cannot cast to TransferComponent.');
  }
}
