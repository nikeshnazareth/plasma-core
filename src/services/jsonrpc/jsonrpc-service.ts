import {BaseService, ServiceOptions} from '../base-service';
import {JSONRPCParam, JSONRPCRequest, JSONRPCResponse} from '../models/rpc';

import {JSONRPC_ERRORS} from './errors';
import * as subdispatchers from './subdispatchers';
import {BaseSubdispatcher} from './subdispatchers/base-subdispatcher';

export class JSONRPCService extends BaseService {
  subdispatchers: BaseSubdispatcher[] = [];

  constructor(options: ServiceOptions) {
    super(options);

    for (const name of Object.keys(subdispatchers)) {
      const subdispatcher =
          (subdispatchers as {[key: string]: typeof BaseSubdispatcher})[name];
      this.registerSubdispatcher(subdispatcher);
    }
  }

  /**
   * Returns all dependencies by combining
   * the dependencies of all subdispatchers.
   * @returns all dependencies.
   */
  get dependencies(): string[] {
    return this.subdispatchers.reduce(
        (dependencies: string[], subdispatcher) => {
          return dependencies.concat(subdispatcher.dependencies);
        },
        []);
  }

  /**
   * Returns all methods of all subdispatchers.
   * @returns all subdispatcher methods as a single object.
   */
  getAllMethods(): {[key: string]: Function} {
    return this.subdispatchers
        .map((subdispatcher) => {
          return subdispatcher.getAllMethods();
        })
        .reduce((pre, cur) => {
          return {...pre, ...cur};
        });
  }

  /**
   * Returns a single method.
   * @param name Name of the method to return.
   * @returns the method with the given name or
   * `undefined` if the method does not exist.
   */
  getMethod(name: string): Function {
    const methods = this.getAllMethods();
    if (name in methods) {
      return methods[name];
    }
    throw new Error('Method not found.');
  }

  /**
   * Calls the method with the given name and parameters.
   * @param method Name of the method to call.
   * @param params Parameters to be used as arguments to the method.
   * @returns the result of the function call.
   */
  async handle(method: string, params: JSONRPCParam[] = []):
      Promise<string|number|{}> {
    const fn = this.getMethod(method);
    return fn(...params);
  }

  /**
   * Handles a raw (JSON) JSON-RPC request.
   * @param request A JSON-RPC request object.
   * @return the result of the JSON-RPC call.
   */
  async handleRawRequest(request: JSONRPCRequest) {
    if (!('method' in request && 'id' in request)) {
      return this.buildError('INVALID_REQUEST', null);
    }

    try {
      this.getMethod(request.method);
    } catch (err) {
      this.log(`ERROR: ${err}`);
      return this.buildError('METHOD_NOT_FOUND', request.id, err);
    }

    let result;
    try {
      result = await this.handle(request.method, request.params);
    } catch (err) {
      this.log(`ERROR: ${err}`);
      return this.buildError('INTERNAL_ERROR', request.id, err);
    }

    const response: JSONRPCResponse = {jsonrpc: '2.0', result, id: request.id};
    return JSON.stringify(response);
  }

  /**
   * Builds a JSON-RPC error response.
   * @param type Error type.
   * @param id RPC command ID.
   * @param err An error message.
   * @returns a stringified JSON-RPC error response.
   */
  private buildError(type: string, id: string|null, message?: string): {} {
    const error: JSONRPCResponse =
        {jsonrpc: '2.0', error: JSONRPC_ERRORS[type], message, id};
    return JSON.stringify(error);
  }

  /**
   * Registers a new subdispatcher to this service.
   * @param subdispatcher Subdispatcher to register.
   */
  private registerSubdispatcher(subdispatcher: typeof BaseSubdispatcher): void {
    this.subdispatchers.push(new subdispatcher(this.app));
  }
}
