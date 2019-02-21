import { BaseService } from '../base-service';
import { EventLog } from 'web3/types';
import { DepositEvent, ExitFinalizedEvent, ExitStartedEvent, BlockSubmittedEvent } from '../models/event-objects';

interface EventHandlerExposedServices {
  eventWatcher: EventWatcher;
}

export class EventHandler extends BaseService {
  services!: EventHandlerExposedServices;
  dependencies = ['eventWatcher'];
  name = 'eventHandler';

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
  private emitContractEvent(name: string, event: any): void {
    this.emit(`event:${name}`, event);
  }

  /**
   * Registers event handlers.
   */
  private registerHandlers(): void {
    const handlers: { [key: string]: any } = {
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
  private onDeposit(events: EventLog[]): void {
    const deposits = events.map((event) => {
      return new DepositEvent(event);
    });
    deposits.forEach((deposit) => {
      this.log(
        `Detected new deposit of ${deposit.amount} [${deposit.token}] for ${
          deposit.owner
        }`
      );
    });
    this.emitContractEvent('Deposit', deposits);
  }

  /**
   * Handles BlockSubmitted events.
   * @param events BlockSubmitted events.
   */
  private onBlockSubmitted(events: EventLog[]): void {
    const blocks = events.map((event) => {
      return new BlockSubmittedEvent(event);
    });
    blocks.forEach((block) => {
      this.log(`Detected block #${block.number}: ${block.hash}`);
    });
    this.emitContractEvent('BlockSubmitted', blocks);
  }

  /**
   * Handles ExitStarted events.
   * @param events ExitStarted events.
   */
  private onExitStarted(events: EventLog[]): void {
    const exits = events.map((event) => {
      return new ExitStartedEvent(event);
    });
    exits.forEach((exit) => {
      this.log(`Detected new started exit: ${exit.id}`);
    });
    this.emitContractEvent('ExitStarted', exits);
  }

  /**
   * Handles ExitFinalized events.
   * @param events ExitFinalized events.
   */
  private onExitFinalized(events: EventLog[]): void {
    const exits = events.map((event) => {
      return new ExitFinalizedEvent(event);
    });
    exits.forEach((exit) => {
      this.log(`Detected new finalized exit: ${exit.id}`);
    });
    this.emitContractEvent('ExitFinalized', exits);
  }
}
