import { utils } from 'plasma-utils'
import { BaseService, ServiceOptions } from '../base-service'
import { EthereumEvent } from '../models/eth'

export interface UserEventWatcherOptions {
  finalityDepth?: number
  eventPollInterval?: number
}

interface EventWatcherOptions extends ServiceOptions {
  finalityDepth: number
  eventPollInterval: number
}

interface DefaultEventWatcherOptions {
  finalityDepth: number
  eventPollInterval: number
}

const defaultOptions: DefaultEventWatcherOptions = {
  finalityDepth: 12,
  eventPollInterval: 15000,
}

export class EventWatcher extends BaseService {
  options!: EventWatcherOptions
  watching = false
  subscriptions: { [key: string]: Function[] } = {}
  events: { [key: string]: boolean } = {}

  constructor(options: UserEventWatcherOptions & ServiceOptions) {
    super(options, defaultOptions)
  }

  get dependencies(): string[] {
    return ['eth', 'syncdb']
  }

  async onStart(): Promise<void> {
    this.reset()
  }

  async onStop(): Promise<void> {
    this.reset()
  }

  /**
   * Subscribes to an event with a given callback.
   * @param {string} event Name of the event to subscribe to.
   * @param {Function} listener Function to be called when the event is triggered.
   */
  subscribe(event: string, listener: Function): void {
    this.startPolling()
    if (!(event in this.events)) {
      this.events[event] = true
      this.subscriptions[event] = []
    }
    this.subscriptions[event].push(listener)
  }

  /**
   * Unsubscribes from an event with a given callback.
   * @param {string} event Name of the event to unsubscribe from.
   * @param {Function} listener Function that was used to subscribe.
   */
  unsubscribe(event: string, listener: Function): void {
    this.subscriptions[event] = this.subscriptions[event].filter((l) => {
      return l !== listener
    })

    // No more listeners, stop watching for the event.
    if (this.subscriptions[event].length === 0) {
      this.events[event] = false
    }
  }

  /**
   * Starts the polling loop.
   * Can only be called once.
   */
  startPolling(): void {
    if (this.watching) return
    this.watching = true
    this.pollEvents()
  }

  /**
   * Resets the watcher.
   */
  private reset(): void {
    this.watching = false
    this.subscriptions = {}
    this.events = {}
  }

  /**
   * Polling loop.
   * Checks events then sleeps before calling itself again.
   * Stops polling if the service is stopped.
   */
  private async pollEvents(): Promise<void> {
    if (!this.started) {
      this.log(`ERROR: Stopped watching for events`)
      return
    }

    try {
      await this.checkEvents()
    } finally {
      await utils.sleep(this.options.eventPollInterval)
      this.pollEvents()
    }
  }

  /**
   * Checks for new events and triggers any listeners on those events.
   * Will only check for events that are currently being listened to.
   */
  private async checkEvents(): Promise<void> {
    const connected = await this.services.eth.connected()
    if (!connected) {
      this.log(`ERROR: Could not connect to Ethereum`)
      return
    }

    // We only want to query final blocks, so we look a few blocks in the past.
    const block = await this.services.eth.getCurrentBlock()
    const lastFinalBlock = Math.max(0, block - this.options.finalityDepth)

    await Promise.all(
      Object.keys(this.events).map((eventName) =>
        this.checkEvent(eventName, lastFinalBlock)
      )
    )
  }

  /**
   * Checks for new instances of an event.
   * @param {string} eventName Name of the event.
   * @param {number} lastFinalBlock Number of the latest block known to be final.
   */
  private async checkEvent(
    eventName: string,
    lastFinalBlock: number
  ): Promise<void> {
    if (!this.events[eventName] || !this.services.eth.contract.hasAddress) {
      return
    }

    // Figure out the last block we've seen.
    const lastLoggedBLock = await this.services.syncdb.getLastLoggedEventBlock(
      eventName
    )
    const firstUnsyncedBlock = lastLoggedBLock + 1

    // Don't do anything if we've already seen the latest final block
    if (firstUnsyncedBlock > lastFinalBlock) return

    this.log(
      `Checking for new ${eventName} events between Ethereum blocks ${firstUnsyncedBlock} and ${lastFinalBlock}`
    )

    // Pull new events from the contract
    let events = await this.services.eth.contract.getPastEvents(eventName, {
      fromBlock: firstUnsyncedBlock,
      toBlock: lastFinalBlock,
    })

    // Filter out events that we've already seen.
    events = await this.getUniqueEvents(events)

    // Emit the events.
    await this.emitEvents(eventName, events)

    // Update the last block that we've seen based on what we just queried.
    await this.services.syncdb.setLastLoggedEventBlock(
      eventName,
      lastFinalBlock
    )
  }

  /**
   * Filters out any events we've already seen.
   * @param events A series of Ethereum events.
   * @returns any events we haven't seen already.
   */
  private async getUniqueEvents(
    events: EthereumEvent[]
  ): Promise<EthereumEvent[]> {
    const isUnique = await Promise.all(
      events.map(async (event) => {
        return !(await this.services.syncdb.hasEvent(event))
      })
    )
    return events.filter((_, i) => isUnique[i])
  }

  /**
   * Emits events for a given event name.
   * @param eventName Name of the event to handle.
   * @param events Event objects for that event.
   */
  private async emitEvents(
    eventName: string,
    events: EthereumEvent[]
  ): Promise<void> {
    if (events.length === 0) return

    // Mark these events as seen.
    await this.services.syncdb.addEvents(events)

    // Alert any listeners.
    for (const listener of this.subscriptions[eventName]) {
      try {
        listener(events)
      } catch (err) {
        console.log(err) // TODO: Handle this.
      }
    }
  }
}
