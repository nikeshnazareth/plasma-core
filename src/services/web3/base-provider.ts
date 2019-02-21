import { BaseService, ServiceOptions } from '../base-service';

export interface UserWeb3Options extends ServiceOptions {
  ethereumEndpoint?: string;
}

export interface Web3Options extends ServiceOptions {
  ethereumEndpoint: string;
}

export interface DefaultWeb3Options {
  ethereumEndpoint: string;
}

export class BaseWeb3Provider extends BaseService {
  options!: Web3Options;
  name = 'web3';

  /**
   * Whether or not the provider is connected.
   * @returns `true` if connected, `false` otherwise.
   */
  async connected(): Promise<boolean> {
    throw new Error('Classes that extend BaseWeb3Provider must implement this class.');
  }
}
