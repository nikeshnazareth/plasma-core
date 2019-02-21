import debug = require('debug');
import { EventEmitter } from 'events';
import { PlasmaApp } from '../plasma';

export interface ServiceOptions {
  app: PlasmaApp;
}

/**
 * A base class for services to extend.
 */
export class BaseService extends EventEmitter {
  started = false;
  options: ServiceOptions;
  app: PlasmaApp;
  services: {};

  constructor(options: ServiceOptions, defaultOptions = {}) {
    super();

    this.options = {
      ...defaultOptions,
      ...options
    };
    this.app = this.options.app;

    // Create a proxy object here so we can
    // override the child's definition of `services`
    // but keep the same interface.
    this.services = new Proxy({}, {
      get: (_, name: string) => {
        const service = this.app.services.get(name);

        if (!service) {
          throw new Error(`Service does not exist: ${name}`);
        }

        if (!service.started) {
          throw new Error(`Service has not been started: ${name}`);
        }

        return service;
      }
    });
  }

  /**
   * Returns the name of this service.
   * @returns Name of the service.
   */
  get name(): string {
    throw new Error(
      'Classes that extend BaseService must implement this method.'
    );
  }

  /**
   * List of services this service depends on, identified by name.
   * @returns List of dependencies.
   */
  get dependencies(): string[] {
    return [];
  }

  /**
   * Convenience method for accessing debug loggers.
   * @returns A mapping from logger names to loggers.
   */
  get loggers(): Map<string, debug.Debugger> {
    return this.app.loggers;
  }

  /**
   * Returns a default logger based on the service's name.
   * @returns A logger instance.
   */
  get log(): debug.Debugger {
    return this.loggers.get(`service:${this.name}`)!;
  }

  /**
   * Returns a debug logger based on the service's name.
   * @returns A logger instance.
   */
  get debug(): debug.Debugger {
    return this.loggers.get(`debug:service:${this.name}`)!;
  }

  /**
   * Checks whether the service and all of its dependencies are started.
   * @returns `true` if all started, `false` otherwise.
   */
  get healthy(): boolean {
    return (
      this.started &&
      this.dependencies.every((dependency: string) => {
        const service = this.app.services.get(dependency);
        return service !== undefined && service.started;
      })
    );
  }

  /**
   * Starts the service.
   */
  async start(): Promise<void> {
    this.started = true;
    await this.onStart();
    this.emit('started');
  }

  /**
   * Stops the service.
   */
  async stop(): Promise<void> {
    this.started = false;
    await this.onStop();
    this.emit('stopped');
  }

  /**
   * Called once the service has been started.
   */
  async onStart(): Promise<void> {
    return;
  }

  /**
   * Called once the service has been stopped.
   */
  async onStop(): Promise<void> {
    return;
  }
}
