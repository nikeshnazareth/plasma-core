const debug = require('debug')
const toposort = require('toposort')
const EventEmitter = require('events').EventEmitter
const services = require('./services/index')

/**
 * Providers are plug-in classes that interface with external services.
 * As a result, we allow clients to modify providers if necessary.
 */
const defaultOptions = {
  dbProvider: services.DBProviders.DefaultDBProvider,
  operatorProvider: services.OperatorProvider,
  walletProvider: services.WalletProviders.DefaultWalletProvider,
  contractProvider: services.ContractProvider,
  web3Provider: services.Web3Provider
}

/**
 * Main class that runs and manages all services.
 */
class Plasma extends EventEmitter {
  constructor (options = {}) {
    super()

    this.options = Object.assign({}, defaultOptions, options)

    if (this.options.debug) {
      debug.enable(this.options.debug)
    }

    this.services = {}
    this._loggers = {}
    this._registerServices()
  }

  /**
   * Proxy object that creates a new logger if
   * trying to access a logger that doesn't exist yet.
   * @return {Object} Mapping of available loggers.
   */
  get loggers () {
    return new Proxy(this._loggers, {
      get: (obj, prop) => {
        if (!(prop in obj)) {
          obj[prop] = debug(prop)
        }
        return obj[prop]
      }
    })
  }

  /**
   * Registers a single service to the app.
   * @param {*} Service Class of the service to register.
   * @param {*} options Any additional options.
   */
  registerService (Service, options = {}) {
    let service = Service

    // Check if it's a class or an instance of the class.
    if (typeof Service === 'function') {
      const appInject = { app: this }
      service = new Service({ ...options, ...appInject })
    } else {
      service.app = this
    }

    // Relay lifecycle events.
    service.on('initialized', () => {
      this.emit(`${service.name}:initialized`)
    })

    this.services[service.name] = service
  }

  /**
   * Registers all services.
   */
  _registerServices () {
    const available = [
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

    for (let service of available) {
      this.registerService(service, this.options)
    }
  }

  /**
   * Returns the names of services ordered by their dependencies.
   * Automatically resolves dependencies.
   * @return {Array<string>} List of service names ordered by dependencies.
   */
  _getOrderedServices () {
    const dependencyGraph = Object.keys(this.services).reduce((graph, key) => {
      const service = this.services[key]
      for (const dependency of service.dependencies) {
        graph.push([service.name, dependency])
      }
      return graph
    }, [])
    return toposort(dependencyGraph).reverse()
  }

  /**
   * Starts a single service.
   * @param {*} name Name of the service to start.
   */
  async startService (name) {
    if (!(name in this.services)) {
      throw new Error(`ERROR: Service does not exist: ${name}`)
    }

    const service = this.services[name]

    for (let dependency of service.dependencies) {
      if (!this.services[dependency] || !this.services[dependency].started) {
        throw new Error(
          `ERROR: Service ${name} is dependent on service that has not been started: ${dependency}`
        )
      }
    }

    try {
      await service.start()
      this.loggers['core:bootstrap'](`${service.name}: STARTED`)
    } catch (err) {
      console.log(err)
    }
  }

  /**
   * Stops a single service.
   * @param {*} name Name of the service to stop.
   */
  async stopService (name) {
    let service = this.services[name]

    try {
      await service.stop()
      this.loggers['core:bootstrap'](`${service.name}: STOPPED`)
    } catch (err) {
      console.log(err)
    }
  }

  /**
   * Starts all available services.
   */
  async start () {
    const services = this._getOrderedServices()
    for (let service of services) {
      await this.startService(service)
    }
  }

  /**
   * Stops all available services.
   */
  async stop () {
    // Stop services backwards to avoid dependencies being killed off.
    const services = this._getOrderedServices().reverse()
    for (let service of services) {
      await this.stopService(service)
    }
  }
}

module.exports = Plasma
