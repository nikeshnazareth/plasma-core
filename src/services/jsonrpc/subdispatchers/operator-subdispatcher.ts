import {BaseSubdispatcher} from './base-subdispatcher';

/**
 * Subdispatcher that handles Operator-related requests.
 */
export class OperatorSubdispatcher extends BaseSubdispatcher {
  get prefix(): string {
    return 'pg_';
  }

  get dependencies(): string[] {
    return ['operator'];
  }

  get methods(): {[key: string]: Function} {
    const operator = this.app.services.operator;
    return {
      submitBlock: operator.submitBlock.bind(operator),
      getEthInfo: operator.getEthInfo.bind(operator),
      getNextBlock: operator.getNextBlock.bind(operator)
    };
  }
}
