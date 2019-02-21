import toposort = require('toposort');
import debug = require('debug');
import { BaseService } from './services/base-service';
import { EventEmitter } from 'events';
import * as services from './services';

// TODONOW: Define these.
interface UserPlasmaOptions {
  debug?: string;
  web3Provider?: services.BaseWeb3Provider | typeof services.BaseWeb3Provider;
  operatorProvider?: any;
  walletProvider?: any;
  contractProvider?: any;
}

interface PlasmaOptions {
  debug: string;
  web3Provider: services.BaseWeb3Provider | typeof services.BaseWeb3Provider;
  operatorProvider?: any;
  walletProvider?: any;
  contractProvider?: any;
}

const defaultOptions: PlasmaOptions = {
  debug: '',
  web3Provider: services.Web3Provider
};

export class PlasmaApp extends EventEmitter {
  options: PlasmaOptions;
  services: Map<string, BaseService> = new Map();
  private _loggers: Map<string, debug.Debugger> = new Map();
  
  constructor(options: UserPlasmaOptions = {}) {
    super();

    this.options = {
      ...defaultOptions,
      ...options
    };

    debug.enable(this.options.debug);
    this.registerServices();
  }

  /**
   * Proxy object that creates a new logger if
   * trying to access a logger that doesn't exist yet.
   * @returns Mapping of available loggers.
   */
  get loggers(): Map<string, debug.Debugger> {
    return new Proxy(this._loggers, {
      get: (obj: Map<string, debug.Debugger>, prop: string): debug.Debugger => {
        if (!(prop in obj)) {
          obj.set(prop, debug(prop));
        }
        return obj.get(prop)!;
      }
    });
  }

  /**
   * Starts a single service.
   * @param name Name of the service to start.
   */
  async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (service === undefined) {
      throw new Error(`ERROR: Service does not exist: ${name}`);
    }

    for (const dependency of service.dependencies) {
      const dep = this.services.get(dependency);
      if (dep === undefined || !dep.started) {
        throw new Error(
          `ERROR: Service ${name} is dependent on service that has not been started: ${dependency}`
        );
      }
    }

    try {
      await service.start();
      const logger = this.loggers.get('core:bootstrap')!;
      logger(`${service.name}: STARTED`);
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Stops a single service.
   * @param name Name of the service to stop.
   */
  async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (service === undefined) {
      throw new Error(`ERROR: Service does not exist: ${name}`);
    }

    try {
      await service.stop();
      const logger = this.loggers.get('core:bootstrap')!;
      logger(`${service.name}: STOPPED`);
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Starts all available services.
   */
  async start(): Promise<void> {
    const services = this.getOrderedServices();
    for (const service of services) {
      await this.startService(service);
    }
  }

  /**
   * Stops all available services.
   */
  async stop(): Promise<void> {
    // Stop services backwards to avoid dependencies being killed off.
    const services = this.getOrderedServices().reverse();
    for (const service of services) {
      await this.stopService(service);
    }
  }

  /**
   * Registers a single service to the app.
   * @param service Class of the service to register.
   * @param options Any additional options.
   */
  registerService(service: BaseService | typeof BaseService, options = {}): void {
    // Check if it's a class or an instance of the class.
    if (typeof service === 'function') {
      const appInject = { app: this };
      service = new service({ ...options, ...appInject });
    } else {
      service.app = this;
    }

    // Relay lifecycle events.
    const lifecycle = ['started', 'initialized', 'stopped'];
    for (const event of lifecycle) {
      service.on(event, () => {
        this.emit(`${service.name}:${event}`);
      });
    }

    this.services.set(service.name, service);
  }

  /**
   * Registers all services.
   */
  private registerServices(): void {
    const available: BaseService[] | Array<typeof BaseService> = [
      /* Providers */
      this.options.web3Provider,
      this.options.operatorProvider,
      this.options.walletProvider,
      this.options.contractProvider,

      /* Database Interfaces */
      services.dbInterfaces.WalletDB,
      services.dbInterfaces.ChainDB,
      services.dbInterfaces.SyncDB,

      /* Services */
      services.DBService,
      services.ETHService,
      services.ProofService,
      services.ChainService,
      services.JSONRPCService,
      services.SyncService,
      services.EventWatcher,
      services.EventHandler
    ]

    for (const service of available) {
      this.registerService(service, this.options);
    }
  }

  /**
   * Returns the names of services ordered by their dependencies.
   * Automatically resolves dependencies.
   * @returns List of service names ordered by dependencies.
   */
  private getOrderedServices(): string[] {
    const dependencyGraph = Object.keys(this.services).reduce((graph: Array<[string, string]>, key) => {
      const service = this.services.get(key);
      if (service === undefined) return graph;

      for (const dependency of service.dependencies) {
        graph.push([service.name, dependency]);
      }

      return graph;
    }, []);

    const sorted = toposort(dependencyGraph) as string[];
    return sorted.reverse();
  }
}
