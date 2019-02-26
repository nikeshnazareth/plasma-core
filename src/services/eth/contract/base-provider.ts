import BigNum from 'bn.js'
import { BaseService, ServiceOptions } from '../../base-service'
import { Deposit } from '../../models/chain'
import { EthereumEvent, EthereumTransactionReceipt } from '../../models/eth'

export interface UserContractOptions {
  registryAddress: string
  plasmaChainName: string
}

type ContractOptions = UserContractOptions & ServiceOptions

export class BaseContractProvider extends BaseService {
  options!: ContractOptions

  constructor(options: UserContractOptions & ServiceOptions) {
    super(options)
  }

  /**
   * @returns Address of the connected contract.
   */
  get address(): string | null {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns `true` if the contract has an address, `false` otherwise.
   */
  get hasAddress(): boolean {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns `true` if the contract is ready to be used, `false` otherwise.
   */
  get ready(): boolean {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns Address of the connected contract.
   */
  get operatorEndpoint(): string {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns Plasma Chain contract name.
   */
  get plasmaChainName(): string {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Returns past events for the contract
   * @param event The name of the event.
   * @param filter The filter object.
   * @returns past events with the given filter.
   */
  async getPastEvents(
    event: string,
    filter: {} = {}
  ): Promise<EthereumEvent[]> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Queries a given block.
   * @param block Number of the block to query.
   * @returns Root hash of the block with that number.
   */
  async getBlock(block: number): Promise<string> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns Number of the block that will be submitted next.
   */
  async getNextBlock(): Promise<number> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns Number of the last submitted block.
   */
  async getCurrentBlock(): Promise<number> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * @returns Address of the current operator.
   */
  async getOperator(): Promise<string> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Returns the address for a given token ID.
   * @param token The token ID.
   * @returns Address of the contract for that token.
   */
  async getTokenAddress(token: string): Promise<string> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Lists a token with the given address
   * so that it can be deposited.
   * @param tokenAddress Address of the token.
   * @param sender Address of the account sending the listToken transaction.
   * @returns The Ethereum transaction result.
   */
  async listToken(
    tokenAddress: string,
    sender: string
  ): Promise<EthereumTransactionReceipt> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Gets the current challenge period.
   * Challenge period is returned in number of blocks.
   * @returns Current challenge period.
   */
  async getChallengePeriod(): Promise<number> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Gets the token ID for a specific token.
   * Token IDs are unique to each plasma chain.
   * TODO: Add link that explains how token IDs work.
   * @param tokenAddress Token contract address.
   * @returns ID of that token.
   */
  async getTokenId(tokenAddress: string): Promise<string> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Checks whether a specific deposit actually exists.
   * @param deposit Deposit to check.
   * @returns `true` if the deposit exists, `false` otherwise.
   */
  async depositValid(deposit: Deposit): Promise<boolean> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Submits a deposit for a user.
   * This method will pipe the `deposit` call to the correct
   * ERC20 or ETH call.
   * @param token Token to deposit, specified by ID.
   * @param amount Amount to deposit.
   * @param owner Address of the user to deposit for.
   * @returns Deposit transaction receipt.
   */
  async deposit(
    token: BigNum,
    amount: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Starts an exit for a user.
   * Exits can only be started on *transfers*, meaning you
   * need to specify the block in which the transfer was received.
   * TODO: Add link that explains this in more detail.
   * @param block Block in which the transfer was received.
   * @param token Token to be exited.
   * @param start Start of the range received in the transfer.
   * @param end End of the range received in the transfer.
   * @param owner Adress to exit from.
   * @returns Exit transaction receipt.
   */
  async startExit(
    block: BigNum,
    token: BigNum,
    start: BigNum,
    end: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Finalizes an exit for a user.
   * @param exitId ID of the exit to finalize.
   * @param exitableEnd Weird quirk in how we handle exits. For more
   * information, see:
   * https://github.com/plasma-group/plasma-contracts/issues/44.
   * @param owner Address that owns this exit.
   * @returns Finalization transaction receipt.
   */
  async finalizeExit(
    exitId: string,
    exitableEnd: BigNum,
    owner: string
  ): Promise<EthereumTransactionReceipt> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }

  /**
   * Submits a block with the given hash.
   * Will only work if the operator's account is unlocked and
   * available to the node.
   * @param hash Hash of the block to submit.
   * @returns Block submission transaction receipt.
   */
  async submitBlock(hash: string): Promise<EthereumTransactionReceipt> {
    throw new Error(
      'Classes that extend BaseContractProvider must implement this method.'
    )
  }
}
