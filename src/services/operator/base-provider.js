const BaseService = require('../base-service')

class BaseOperatorProvider extends BaseService {
  get name () {
    return 'operator'
  }

  /**
   * Returns the next plasma block, according the operator.
   * @return {number} Next plasma block number.
   */
  async getNextBlock () {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }

  /**
   * Returns information about the smart contract.
   * @return {Object} Smart contract info.
   */
  async getEthInfo () {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }

  /**
   * Returns transaction received by a given address
   * between two given blocks.
   * @param {string} address Address to query.
   * @param {number} startBlock Block to query from.
   * @param {number} endBlock Block to query to.
   * @return {Array<string>} List of encoded transactions.
   */
  async getTransactions (address, startBlock, endBlock) {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }

  /**
   * Gets a transaction proof for a transaction.
   * @param {string} encoded The encoded transaction.
   * @return {Object} Proof information for the transaction.
   */
  async getTransaction (encoded) {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }

  /**
   * Sends a signed transaction to the operator.
   * @param {string} transaction The encoded transaction.
   * @return {string} The transaction receipt.
   */
  async sendTransaction (transaction) {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }

  /**
   * Attempts to have the operator submit a new block.
   * Probably won't work if the operator is properly
   * configured but used for testing.
   */
  async submitBlock () {
    throw new Error(
      'Classes that extend BaseOperatorProvider must implement this method.'
    )
  }
}

module.exports = BaseOperatorProvider
