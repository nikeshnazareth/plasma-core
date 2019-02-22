import toposort = require('toposort');
import debug = require('debug');
import { EventEmitter } from 'events';
import * as services from './services';
import { AppServices, RequiredServiceTypes } from './services/service-interface';

interface UserPlasmaOptions {
  debug?: string;
  ethProvider?: typeof services.BaseETHProvider;
  operatorProvider?: typeof services.BaseOperatorProvider;
  walletProvider?: typeof services.BaseWalletProvider;
}

interface PlasmaOptions {
  debug: string;
  ethProvider: typeof services.BaseETHProvider;
  operatorProvider: typeof services.BaseOperatorProvider;
  walletProvider: typeof services.BaseWalletProvider;
}

const defaultOptions: PlasmaOptions = {
  debug: '',
  ethProvider: services.ETHProvider,
  operatorProvider: services.OperatorProvider,
  walletProvider: services.LocalWalletProvider
};

export class PlasmaApp extends EventEmitter {
  options: PlasmaOptions;
  private _services: AppServices;
  private _loggers: Map<string, debug.Debugger> = new Map();

  constructor(options: UserPlasmaOptions = {}) {
    super();

    this.options = {
      ...defaultOptions,
      ...options
    };

    debug.enable(this.options.debug);
    this._services = this.buildRequiredServices();
  }

  /**
   * Proxy object for services that throws if the accessed
   * service is undefined
   */
  get services(): AppServices {
    return new Proxy(this._services, {
      get: (services: AppServices, key: string) => {
        const service = services[key];
        if (service === undefined) {
          throw new Error(`ERROR: Service does not exist: ${key}`);
        }
        return service;
      }
    });
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
    const service = this.services[name];

    for (const dependency of service.dependencies) {
      const dep = this.services[dependency];
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
    const service = this.services[name];

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
   * @param name Name of the service.
   * @param options Any additional options.
   */
  registerService(service: typeof services.BaseService, name: string, options = {}): void {
    const instance = this.buildService(service, name, options);
    this.services[name] = instance;
  }

  /**
   * Builds a single service into a service instance.
   * @param service The service class to build.
   * @param name Name of the service.
   * @param options Any additional options to the service.
   * @returns the built service.
   */
  private buildService(service: typeof services.BaseService, name: string, options = {}): services.BaseService {
    const appInject = { app: this, name };
    const instance = new service({ ...options, ...appInject });

    // Relay lifecycle events.
    const lifecycle = ['started', 'initialized', 'stopped'];
    for (const event of lifecycle) {
      instance.on(event, () => {
        this.emit(`${name}:${event}`);
      });
    }

    return instance;
  }

  /**
   * Builds the required services into their instances.
   * @returns an AppServices object.
   */
  private buildRequiredServices(): AppServices {
    const required: RequiredServiceTypes = {
      /* Providers */
      eth: this.options.ethProvider,
      operator: this.options.operatorProvider,
      wallet: this.options.walletProvider,

      /* Services */
      guard: services.GuardService,
      sync: services.SyncService,
      dbservice: services.DBService,
      eventWatcher: services.EventWatcher,
      eventHandler: services.EventHandler,
      proof: services.ProofService,
      chain: services.ChainService,
      jsonrpc: services.JSONRPCService,

      /* Database Interfaces */
      walletdb: services.WalletDB,
      chaindb: services.ChainDB,
      syncdb: services.SyncDB
    };

    const built: { [key: string]: services.BaseService } = {};
    for (const service of Object.keys(required)) {
      built[service] = this.buildService(required[service], service, this.options);
    }

    return built as AppServices;
  }

  /**
   * Returns the names of services ordered by their dependencies.
   * Automatically resolves dependencies.
   * @returns a list of service names ordered by dependencies.
   */
  private getOrderedServices(): string[] {
    const dependencyGraph = Object.keys(this.services).reduce((graph: Array<[string, string]>, key) => {
      const service = this.services[key];

      for (const dependency of service.dependencies) {
        graph.push([service.name, dependency]);
      }

      return graph;
    }, []);

    const sorted = toposort(dependencyGraph) as string[];
    return sorted.reverse();
  }
}
