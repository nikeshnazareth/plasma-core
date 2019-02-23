import {BaseService} from '../base-service';
import {EthereumEvent} from '../models/eth';
import {BlockSubmittedEvent, DepositEvent, ExitFinalizedEvent, ExitStartedEvent} from '../models/events';

export class EventHandler extends BaseService {
  dependencies = ['eventWatcher'];

  async onStart(): Promise<void> {
    this.registerHandlers();
  }

  async onStop(): Promise<void> {
    this.removeAllListeners();
  }

  /**
   * Emits a prefixed event.
   * @param name Name of the event.
   * @param event Event object.
   */
  private emitContractEvent(name: string, event: {}): void {
    this.emit(`event:${name}`, event);
  }

  /**
   * Registers event handlers.
   */
  private registerHandlers(): void {
    const handlers: {[key: string]: Function} = {
      DepositEvent: this.onDeposit,
      SubmitBlockEvent: this.onBlockSubmitted,
      BeginExitEvent: this.onExitStarted,
      FinalizeExitEvent: this.onExitFinalized
    };
    for (const event of Object.keys(handlers)) {
      this.services.eventWatcher.subscribe(event, handlers[event].bind(this));
    }
  }

  /**
   * Handles Deposit events.
   * @param events Deposit events.
   */
  private onDeposit(events: EthereumEvent[]): void {
    const deposits = events.map(DepositEvent.from);
    deposits.forEach((deposit) => {
      this.log(`Detected new deposit of ${deposit.amount} [${
          deposit.token}] for ${deposit.owner}`);
    });
    this.emitContractEvent('Deposit', deposits);
  }

  /**
   * Handles BlockSubmitted events.
   * @param events BlockSubmitted events.
   */
  private onBlockSubmitted(events: EthereumEvent[]): void {
    const blocks = events.map(BlockSubmittedEvent.from);
    blocks.forEach((block) => {
      this.log(`Detected block #${block.number}: ${block.hash}`);
    });
    this.emitContractEvent('BlockSubmitted', blocks);
  }

  /**
   * Handles ExitStarted events.
   * @param events ExitStarted events.
   */
  private onExitStarted(events: EthereumEvent[]): void {
    const exits = events.map(ExitStartedEvent.from);
    exits.forEach((exit) => {
      this.log(`Detected new started exit: ${exit.id}`);
    });
    this.emitContractEvent('ExitStarted', exits);
  }

  /**
   * Handles ExitFinalized events.
   * @param events ExitFinalized events.
   */
  private onExitFinalized(events: EthereumEvent[]): void {
    const exits = events.map(ExitFinalizedEvent.from);
    exits.forEach((exit) => {
      this.log(`Detected new finalized exit: ${exit.id}`);
    });
    this.emitContractEvent('ExitFinalized', exits);
  }
}
