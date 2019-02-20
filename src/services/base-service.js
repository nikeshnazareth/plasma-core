const EventEmitter = require('events')

/**
 * A base class for services to extend.
 */
class BaseService extends EventEmitter {
  constructor (options = {}, defaultOptions = {}) {
    super()

    this.options = Object.assign({}, defaultOptions, options)
    this.app = options.app
    this.started = false
  }

  /**
   * Returns the name of this service.
   * @return {string} Name of the service.
   */
  get name () {
    throw new Error(
      'Classes that extend BaseService must implement this method'
    )
  }

  /**
   * List of services this service depends on, identified by name.
   * @return {Array<string>} List of dependencies.
   */
  get dependencies () {
    return []
  }

  /**
   * Convenience method for getting available services.
   */
  get services () {
    return new Proxy(this.app.services, {
      get: (obj, prop) => {
        // Block services from trying to access inactive services.
        if (!obj[prop].started) {
          throw new Error(`Service not started: ${prop}`)
        }

        return obj[prop]
      }
    })
  }

  /**
   * Convenience method for accessing debug loggers.
   * @return {Object} An object that houses loggers.
   */
  get loggers () {
    return this.app.loggers
  }

  /**
   * Returns a default logger based on the service's name.
   * @return {Logger} A logger instance.
   */
  get log () {
    return this.loggers[`service:${this.name}`]
  }

  /**
   * Returns a debug logger based on the service's name.
   * @return {Logger} A logger instance.
   */
  get debug () {
    return this.loggers[`debug:service:${this.name}`]
  }

  /**
   * Checks whether the service and all of its dependencies are started.
   * @return {boolean} `true` if all started, `false` otherwise.
   */
  get healthy () {
    return (
      this.started &&
      this.dependencies.every((dependency) => {
        return this.app.services[dependency].started
      })
    )
  }

  /**
   * Starts the service.
   */
  async start () {
    this.started = true
    await this._onStart()
    this.emit('started')
  }

  /**
   * Called once the service has been started.
   */
  async _onStart () {
    return true
  }

  /**
   * Stops the service.
   */
  async stop () {
    this.started = false
    await this._onStop()
    this.emit('stopped')
  }

  /**
   * Called once the service has been stopped.
   */
  async _onStop () {
    return true
  }
}

module.exports = BaseService
