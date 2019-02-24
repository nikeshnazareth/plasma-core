import debug = require('debug');
import {EventEmitter} from 'events';
import {AppServices} from './service-interface';
import {PlasmaApp, DebugMap} from '../plasma';

export interface ServiceOptions {
  app: PlasmaApp;
  name: string;
}

/**
 * A base class for services to extend.
 */
export class BaseService extends EventEmitter {
  started = false;
  name: string;
  options: ServiceOptions;
  app: PlasmaApp;

  constructor(options: ServiceOptions, defaultOptions = {}) {
    super();

    this.options = {...defaultOptions, ...options};
    this.app = this.options.app;
    this.name = this.options.name;
  }

  /**
   * List of services this service depends on, identified by name.
   * @returns a list of dependencies.
   */
  get dependencies(): string[] {
    return [];
  }

  /**
   * Convenience method for accessing debug loggers.
   * @returns A mapping from logger names to loggers.
   */
  get loggers(): DebugMap{
    return this.app.loggers;
  }

  /**
   * Returns a default logger based on the service's name.
   * @returns A logger instance.
   */
  get log(): debug.Debugger {
    return this.loggers[`service:${this.name}`];
  }

  /**
   * Returns a debug logger based on the service's name.
   * @returns A logger instance.
   */
  get debug(): debug.Debugger {
    return this.loggers[`debug:service:${this.name}`];
  }

  /**
   * Proxy that blocks services from accessing
   * services that haven't been started.
   * @returns app services.
   */
  get services(): AppServices {
    return new Proxy(this.app.services, {
      get: (services: AppServices, name: string) => {
        const service = services[name];
        if (!service.started) {
          throw new Error(`Service has not been started: ${name}`);
        }
        return service;
      }
    });
  }

  /**
   * Checks whether the service and all of its dependencies are started.
   * @returns `true` if all started, `false` otherwise.
   */
  get healthy(): boolean {
    return (this.started && this.dependencies.every((dependency: string) => {
      try {
        const service = this.services[dependency];
        return service !== undefined && service.started;
      } catch {
        return false;
      }
    }));
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
