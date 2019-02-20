const BaseService = require('../base-service')

class BaseContractProvider extends BaseService {
  get name () {
    return 'contract'
  }

  /**
   * @return {string} Address of the connected contract.
   */
  get address () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {boolean} `true` if the contract has an address, `false` otherwise.
   */
  get hasAddress () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {boolean} `true` if the contract is ready to be used, `false` otherwise.
   */
  get ready () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {string} Plasma Chain contract name.
   */
  get plasmaChainName () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Queries a given block.
   * @param {number} block Number of the block to query.
   * @return {string} Root hash of the block with that number.
   */
  async getBlock (block) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {number} Number of the block that will be submitted next.
   */
  async getNextBlock () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {number} Number of the last submitted block.
   */
  async getCurrentBlock () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @return {string} Address of the current operator.
   */
  async getOperator () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Returns the address for a given token ID.
   * @param {string} token The token ID.
   * @return {string} Address of the contract for that token.
   */
  async getTokenAddress (token) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Lists a token with the given address
   * so that it can be deposited.
   * @param {string} tokenAddress Address of the token.
   * @param {string} sender Address of the account sending the listToken transaction.
   * @return {EthereumTransaction} The Ethereum transaction result.
   */
  async listToken (tokenAddress, sender) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Gets the current challenge period.
   * Challenge period is returned in number of blocks.
   * @return {number} Current challenge period.
   */
  async getChallengePeriod () {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Gets the token ID for a specific token.
   * Token IDs are unique to each plasma chain.
   * TODO: Add link that explains how token IDs work.
   * @param {string} tokenAddress Token contract address.
   * @return {string} ID of that token.
   */
  async getTokenId (tokenAddress) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Checks whether a specific deposit actually exists.
   * @param {Deposit} deposit Deposit to check.
   * @return {boolean} `true` if the deposit exists, `false` otherwise.
   */
  async depositValid (deposit) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Submits a deposit for a user.
   * This method will pipe the `deposit` call to the correct
   * ERC20 or ETH call.
   * @param {BigNum} token Token to deposit, specified by ID.
   * @param {BigNum} amount Amount to deposit.
   * @param {string} owner Address of the user to deposit for.
   * @return {EthereumTransaction} Deposit transaction receipt.
   */
  async deposit (token, amount, owner) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Starts an exit for a user.
   * Exits can only be started on *transfers*, meaning you
   * need to specify the block in which the transfer was received.
   * TODO: Add link that explains this in more detail.
   * @param {BigNum} block Block in which the transfer was received.
   * @param {BigNum} token Token to be exited.
   * @param {BigNum} start Start of the range received in the transfer.
   * @param {BigNum} end End of the range received in the transfer.
   * @param {string} owner Adress to exit from.
   * @return {EthereumTransaction} Exit transaction receipt.
   */
  async startExit (block, token, start, end, owner) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Finalizes an exit for a user.
   * @param {string} exitId ID of the exit to finalize.
   * @param {BigNum} exitableEnd Weird quirk in how we handle exits. For more information, see: https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param {string} owner Address that owns this exit.
   * @return {EthereumTransaction} Finalization transaction receipt.
   */
  async finalizeExit (exitId, exitableEnd, owner) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Submits a block with the given hash.
   * Will only work if the operator's account is unlocked and
   * available to the node.
   * @param {string} hash Hash of the block to submit.
   * @return {EthereumTransaction} Block submission transaction receipt.
   */
  async submitBlock (hash) {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }
}

module.exports = BaseContractProvider
