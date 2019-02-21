import { BaseService } from '../base-service';
import { Proof } from '../models/chain-objects';
import { EthInfo } from '../models/operator-objects';

export class BaseOperatorProvider extends BaseService {
  name = 'operator';

  /**
   * Returns the next plasma block, according the operator.
   * @return Next plasma block number.
   */
  async getNextBlock(): Promise<number> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }

  /**
   * Returns information about the smart contract.
   * @return Smart contract info.
   */
  async getEthInfo(): Promise<EthInfo> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }

  /**
   * Returns transaction received by a given address
   * between two given blocks.
   * @param address Address to query.
   * @param startBlock Block to query from.
   * @param endBlock Block to query to.
   * @return List of encoded transactions.
   */
  async getReceivedTransactions(address: string, startBlock: number, endBlock: number): Promise<string[]> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }

  /**
   * Gets a transaction proof for a transaction.
   * @param encoded The encoded transaction.
   * @return Proof information for the transaction.
   */
  async getTransactionProof(encoded: string): Promise<Proof> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }

  /**
   * Sends a signed transaction to the operator.
   * @param transaction The encoded transaction.
   * @returns The transaction receipt.
   */
  async sendTransaction(transaction: string): Promise<string> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }

  /**
   * Attempts to have the operator submit a new block.
   * Probably won't work if the operator is properly
   * configured but used for testing.
   * @returns A promise that resolves once the request goes through.
   */
  async submitBlock(): Promise<void> {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    );
  }
}
