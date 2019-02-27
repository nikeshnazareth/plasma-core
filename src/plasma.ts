import debug from 'debug'
import { EventEmitter } from 'events'
import toposort from 'toposort'

import * as services from './services'
import { UserDBOptions } from './services/db/db-service'
import { UserETHProviderOptions } from './services/eth/base-provider'
import { UserEventWatcherOptions } from './services/events/event-watcher'
import { UserOperatorOptions } from './services/operator/operator-provider'
import { AppServices, RequiredServiceTypes } from './services/service-interface'
import { UserSyncOptions } from './services/sync-service'

export interface UserPlasmaOptions
  extends UserSyncOptions,
    UserOperatorOptions,
    UserEventWatcherOptions,
    UserETHProviderOptions,
    UserDBOptions {
  debug?: string
  ethProvider?: typeof services.BaseETHProvider
  operatorProvider?: typeof services.BaseOperatorProvider
  walletProvider?: typeof services.BaseWalletProvider
}

interface PlasmaOptions {
  debug: string
  ethProvider: typeof services.BaseETHProvider
  operatorProvider: typeof services.BaseOperatorProvider
  walletProvider: typeof services.BaseWalletProvider
}

const defaultOptions: PlasmaOptions = {
  debug: '',
  ethProvider: services.ETHProvider,
  operatorProvider: services.OperatorProvider,
  walletProvider: services.LocalWalletProvider,
}

export interface DebugMap {
  [key: string]: debug.Debugger
}

export class PlasmaApp extends EventEmitter {
  public options: PlasmaOptions
  private appServices: AppServices
  private appLoggers: DebugMap = {}

  constructor(options: UserPlasmaOptions) {
    super()

    this.options = { ...defaultOptions, ...options }

    debug.enable(this.options.debug)
    this.appServices = this.buildRequiredServices()
  }

  /**
   * Proxy object for services that throws if the accessed
   * service is undefined
   */
  get services(): AppServices {
    return new Proxy(this.appServices, {
      get: (obj: AppServices, key: string) => {
        const service = obj[key]
        if (service === undefined) {
          throw new Error(`Service does not exist: ${key}`)
        }
        return service
      },
    })
  }

  /**
   * Proxy object that creates a new logger if
   * trying to access a logger that doesn't exist yet.
   * @returns Mapping of available loggers.
   */
  get loggers(): DebugMap {
    return new Proxy(this.appLoggers, {
      get: (obj: DebugMap, key: string) => {
        if (!(key in obj)) {
          obj[key] = debug(key)
        }
        return obj[key]
      },
    })
  }

  /**
   * Starts a single service.
   * @param name Name of the service to start.
   */
  public async startService(name: string): Promise<void> {
    const service = this.services[name]

    for (const dependency of service.dependencies) {
      const dep = this.services[dependency]
      if (dep === undefined || !dep.started) {
        throw new Error(
          `ERROR: Service ${name} is dependent on service that has not been started: ${dependency}`
        )
      }
    }

    const logger = this.loggers['core:bootstrap']
    try {
      await service.start()
      logger(`${service.name}: STARTED`)
    } catch (err) {
      logger(`ERROR: ${err}`)
    }
  }

  /**
   * Stops a single service.
   * @param name Name of the service to stop.
   */
  public async stopService(name: string): Promise<void> {
    const service = this.services[name]

    const logger = this.loggers['core:bootstrap']
    try {
      await service.stop()
      logger(`${service.name}: STOPPED`)
    } catch (err) {
      logger(`ERROR: ${err}`)
    }
  }

  /**
   * Starts all available services.
   */
  public async start(): Promise<void> {
    const orderedServices = this.getOrderedServices()
    for (const service of orderedServices) {
      await this.startService(service)
    }
  }

  /**
   * Stops all available services.
   */
  public async stop(): Promise<void> {
    // Stop services backwards to avoid dependencies being killed off.
    const orderedServices = this.getOrderedServices().reverse()
    for (const service of orderedServices) {
      await this.stopService(service)
    }
  }

  /**
   * Registers a single service to the app.
   * @param service Class of the service to register.
   * @param name Name of the service.
   * @param options Any additional options.
   */
  public registerService(
    service: typeof services.BaseService,
    name: string,
    options = {}
  ): void {
    const instance = this.buildService(service, name, options)
    this.services[name] = instance
  }

  /**
   * Builds the required services into their instances.
   * @returns an AppServices object.
   */
  public buildRequiredServices(): AppServices {
    const required: RequiredServiceTypes = {
      /* Providers */
      eth: this.options.ethProvider,
      operator: this.options.operatorProvider,
      wallet: this.options.walletProvider,

      /* Services */
      chain: services.ChainService,
      dbservice: services.DBService,
      eventHandler: services.EventHandler,
      eventWatcher: services.EventWatcher,
      guard: services.GuardService,
      jsonrpc: services.JSONRPCService,
      proof: services.ProofService,
      sync: services.SyncService,

      /* Database Interfaces */
      chaindb: services.ChainDB,
      syncdb: services.SyncDB,
      walletdb: services.WalletDB,
    }

    const built: { [key: string]: services.BaseService } = {}
    for (const service of Object.keys(required)) {
      built[service] = this.buildService(
        required[service],
        service,
        this.options
      )
    }

    return built as AppServices
  }

  /**
   * Builds a single service into a service instance.
   * @param service The service class to build.
   * @param name Name of the service.
   * @param options Any additional options to the service.
   * @returns the built service.
   */
  private buildService(
    service: typeof services.BaseService,
    name: string,
    options = {}
  ): services.BaseService {
    const appInject = { app: this, name }
    const instance = new service({ ...options, ...appInject })

    // Relay lifecycle events.
    const lifecycle = ['started', 'initialized', 'stopped']
    for (const event of lifecycle) {
      instance.on(event, () => {
        this.emit(`${name}:${event}`)
      })
    }

    return instance
  }

  /**
   * Returns the names of services ordered by their dependencies.
   * Automatically resolves dependencies.
   * @returns a list of service names ordered by dependencies.
   */
  private getOrderedServices(): string[] {
    const dependencyGraph = Object.keys(this.services).reduce(
      (graph: Array<[string, string]>, key) => {
        const service = this.services[key]

        for (const dependency of service.dependencies) {
          graph.push([service.name, dependency])
        }

        return graph
      },
      []
    )

    const sorted = toposort(dependencyGraph) as string[]
    return sorted.reverse()
  }
}
