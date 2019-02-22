import { PlasmaApp } from '../../../plasma';

/**
 * Base class for JSON-RPC subdispatchers that handle requests.
 */
export class BaseSubdispatcher {
  app: PlasmaApp;

  constructor(app: PlasmaApp) {
    this.app = app;
  }

  /**
   * Returns the list of services this subdispatcher depends on.
   * @returns a list of depdendencies.
   */
  get dependencies(): string[] {
    return [];
  }

  /**
   * Returns the JSON-RPC prefix of this subdispatcher.
   * @returns the prefix.
   */
  get prefix(): string {
    throw new Error(
      'Classes that extend Subdispatcher must implement this method'
    );
  }

  /**
   * Returns an object with pointers to methods.
   * @return names and pointers to handlers.
   */
  get methods(): { [key: string]: Function } {
    throw new Error(
      'Classes that extend Subdispatcher must implement this method'
    );
  }

  /**
   * Returns all JSON-RPC methods of this subdispatcher.
   * @returns prefixed names and pointers to handlers.
   */
  getAllMethods(): { [key: string]: Function } {
    const methods: { [key: string]: Function } = {};
    for (const method of Object.keys(this.methods)) {
      methods[this.prefix + method] = this.methods[method];
    }
    return methods;
  }
}
