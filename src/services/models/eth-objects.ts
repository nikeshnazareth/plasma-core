export interface EthereumTransaction {
  transactionHash: string;
}

export interface EthereumEvent {
  returnValues: any;
  blockNumber: number;
}
