import { ServiceOptions } from '../base-service';
import { Proof, Deposit, ProofElement } from '../models/chain-objects';
import { EthInfo, OperatorTransaction, OperatorProof } from '../models/operator-objects';
import { BaseOperatorProvider } from './base-provider';
import { utils, serialization } from 'plasma-utils';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import uuidv4 from 'uuid/v4';
import BigNum from 'bn.js';

const models = serialization.models;
const SignedTransaction = models.SignedTransaction;

interface UserOperatorOptions extends ServiceOptions {
  operatorPingInterval?: number;
}

interface OperatorOptions extends ServiceOptions {
  operatorPingInterval: number;
}

interface DefaultOperatorOptions {
  operatorPingInterval: number;
}

interface JSONRPCResponse {
  id: string;
  error?: string;
  result?: string | {};
}

const defaultOptions: DefaultOperatorOptions = {
  operatorPingInterval: 10000
};

export class OperatorProvider extends BaseOperatorProvider {
  options!: OperatorOptions;
  dependencies = ['contract'];
  pinging = false;
  endpoint?: string;
  http?: AxiosInstance;

  constructor(options: UserOperatorOptions) {
    super(options, defaultOptions);
  }

  async onStart(): Promise<void> {
    this.services.contract.on('initialized', () => {
      this.initConnection();
    });
    this.startPingInterval();
  }

  /**
   * Regularly pings the operator to check if it's online.
   */
  async startPingInterval(): Promise<void> {
    if (this.pinging) return;
    this.pinging = true;
    this.pingInterval();
  }

  async getNextBlock(): Promise<number> {
    const block = await this.handle('getBlockNumber');
    return block as number;
  }

  async getEthInfo(): Promise<EthInfo> {
    return this.handle('getEthInfo');
  }

  async getReceivedTransactions(address: string, startBlock: number, endBlock: number): Promise<string[]> {
    const txs: any[] = await this.handle('getTransactions', [
      address,
      startBlock,
      endBlock
    ]);

    // Parse weird buffer objects into hex strings.
    // TODO: Fix operator so this isn't necessary.
    return txs.map((tx) => {
      return Buffer.from(tx).toString('hex');
    });
  }

  async getTransactionProof(encoded: string): Promise<Proof> {
    const transaction = new SignedTransaction(encoded);
    const rawProof = await this.handle('getHistoryProof', [
      0,
      transaction.block,
      encoded
    ]);

    // Parse deposits into useable objects.
    const deposits: Deposit[] = rawProof.deposits.map((deposit: OperatorTransaction) => {
      return Deposit.fromOperatorTransfer(deposit.transfers[0], deposit.block);
    });

    // Figure out the earliest block in which a deposit was created.
    const earliestBlock = deposits.reduce((a, b) => {
      return a.block.lt(b.block) ? a : b;
    }).block.toNumber();

    // Figure out which blocks have proofs.
    const nonEmptyBlocks = Object.keys(rawProof.transactionHistory).map((i) => {
      return Number(i);
    }).sort((a, b) => {
      return new BigNum(a, 10).sub(new BigNum(b, 10)).toNumber();
    });
    const latestBlock = Math.max(...nonEmptyBlocks);

    // Make those proofs usable.
    const nonEmptyProofs: ProofElement[] = nonEmptyBlocks.reduce((proofs: ProofElement[], block) => {
      const operatorProofs: OperatorProof[] = rawProof.transactionHistory[block];
      const parsed: ProofElement[] = operatorProofs.map((proof) => {
        return ProofElement.fromOperatorProof(proof);
      });
      return proofs.concat(parsed);
    }, []);

    // Construct empty proof objects for the rest.
    const emptyProofs: ProofElement[] = [];
    for (let i = earliestBlock + 1; i < latestBlock; i++) {
      if (!nonEmptyBlocks.includes(i)) {
        emptyProofs.push(ProofElement.fromEmptyProof(i));
      }
    }

    // Join and sort the elements block number.
    const proof: ProofElement[] = nonEmptyProofs.concat(emptyProofs).sort((a, b) => {
      return a.transaction.block.sub(b.transaction.block).toNumber();
    });

    return {
      transaction,
      proof,
      deposits
    };
  }

  async sendTransaction(transaction: string): Promise<string> {
    const tx = new SignedTransaction(transaction);
    return this.handle('addTransaction', [tx.encoded]);
  }

  async submitBlock(): Promise<void> {
    return this.handle('newBlock');
  }

  /**
   * Sends a JSON-RPC command as a HTTP POST request.
   * @param method Name of the method to call.
   * @param params Any extra parameters.
   * @returns The result of the operation or an error.
   */
  private async handle(method: string, params: any[] = []): Promise<any> {
    if (this.http === undefined) {
      throw new Error('Cannot make request because endpoint has not been set.');
    }

    let response: AxiosResponse;
    try {
      response = await this.http.post('/', {
        jsonrpc: '2.0',
        method,
        params,
        id: uuidv4()
      });
    } catch (err) {
      this.log(`ERROR: ${err}`);
      throw err;
    }

    const data: JSONRPCResponse = utils.isString(response.data) ? JSON.parse(response.data) : response.data;
    if (data.error) {
      throw data.error;
    }

    return data.result;
  }

  /**
   * Initializes the connection to the operator.
   */
  private async initConnection(): Promise<void> {
    this.endpoint = this.services.contract.operatorEndpoint;
    const baseURL = this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`;
    this.http = axios.create({
      baseURL
    });
  }

  /**
   * Regularly pings the operator to check if it's online.
   */
  private async pingInterval(): Promise<void> {
    try {
      if (this.endpoint !== undefined) {
        await this.getEthInfo()
        if (!this.online) {
          this.log('Successfully connected to operator.');
        }
        this.online = true;
      }
    } catch (err) {
      this.online = false;
      this.log('ERROR: Cannot connect to operator. Attempting to reconnect...');
    } finally {
      await utils.sleep(this.options.operatorPingInterval);
      this.pingInterval();
    }
  }
}
