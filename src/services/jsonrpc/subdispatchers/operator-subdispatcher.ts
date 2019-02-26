import { BaseSubdispatcher } from './base-subdispatcher'

/**
 * Subdispatcher that handles Operator-related requests.
 */
export class OperatorSubdispatcher extends BaseSubdispatcher {
  get prefix(): string {
    return 'pg_'
  }

  get dependencies(): string[] {
    return ['operator']
  }

  get methods(): { [key: string]: (...args: any) => any } {
    const operator = this.app.services.operator
    return {
      /* Operator */
      getEthInfo: operator.getEthInfo.bind(operator),
      getNextBlock: operator.getNextBlock.bind(operator),
      submitBlock: operator.submitBlock.bind(operator),
    }
  }
}
