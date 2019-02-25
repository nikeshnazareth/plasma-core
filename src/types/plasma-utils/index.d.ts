declare module 'plasma-utils' {
  import BigNum from 'bn.js';

  namespace constants {
    interface Account {
      address: string;
      privateKey: string;
    }
  
    const NULL_ADDRESS: string;
    const ACCOUNTS: Account[];
  }

  namespace utils {
    function isString(value: any): boolean;
    function sleep(ms: number): Promise<void>;
    
    var web3Utils: any;
  }

  class PlasmaMerkleSumTree {
    static getTransferProofBounds(
      transaction: serialization.models.UnsignedTransaction,
      transferProof: serialization.models.TransferProof
    ): { implicitStart: BigNum, implicitEnd: BigNum };

    static checkTransactionProof(
      transaction: serialization.models.UnsignedTransaction,
      proof: serialization.models.TransactionProof,
      root: string
    ): boolean;
  }

  namespace serialization {
    namespace models {
      class BaseModel {
        constructor(args: any);
        encoded: string;
      }

      class Signature extends BaseModel {
        v: string;
        r: string;
        s: string;
      }

      class Transfer extends BaseModel {
        sender: string;
        recipient: string;
        token: BigNum;
        start: BigNum;
        end: BigNum;
        block?: BigNum;
        typedStart?: BigNum;
        typedEnd?: BigNum;
        implicitStart?: BigNum;
        implicitEnd?: BigNum;
        implicit?: boolean;
      }

      class UnsignedTransaction extends BaseModel {
        block: BigNum;
        hash: string;
        transfers: Transfer[];
        isEmptyBlockTransaction: boolean;
      }

      class SignedTransaction extends UnsignedTransaction {
        signatures: Signature[];
        checkSigs(): boolean;
      }

      class TransferProof extends BaseModel {
        parsedSum: BigNum;
        leafIndex: BigNum;
        signature: Signature;
        inclusionProof: string[];
      }

      class TransactionProof extends BaseModel {
        transferProofs: TransferProof[];
      }
    }
  }
}
