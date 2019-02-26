import { BaseService } from '../../base-service'
import { EthereumEvent } from '../../models/eth'
import { BaseDBProvider } from '../backends/base-provider'

export class SyncDB extends BaseService {
  get dependencies(): string[] {
    return ['eth', 'dbservice']
  }

  /**
   * @returns the current db instance.
   */
  get db(): BaseDBProvider {
    const db = this.services.dbservice.dbs.sync
    if (db === undefined) {
      throw new Error('SyncDB is not yet initialized.')
    }
    return db
  }

  public async onStart(): Promise<void> {
    if (this.services.eth.contract.hasAddress) {
      await this.open()
    } else {
      await new Promise((resolve) => {
        this.services.eth.contract.on('initialized', async () => {
          await this.open()
          resolve()
        })
      })
    }
  }

  /**
   * Opens the database connection.
   */
  public async open(): Promise<void> {
    const address = this.services.eth.contract.address
    await this.services.dbservice.open('sync', { id: address })
  }

  /**
   * Returns the last synced block for a given event.
   * @param eventName Name of the event.
   * @returns Last synced block number.
   */
  public async getLastLoggedEventBlock(eventName: string): Promise<number> {
    return (await this.db.get(`lastlogged:${eventName}`, -1)) as number
  }

  /**
   * Sets the last synced block for a given event.
   * @param eventName Name of the event.
   * @param block Last synced block number.
   */
  public async setLastLoggedEventBlock(
    eventName: string,
    block: number
  ): Promise<void> {
    await this.db.set(`lastlogged:${eventName}`, block)
  }

  /**
   * Returns the last synced block.
   * @returns Last synced block number.
   */
  public async getLastSyncedBlock(): Promise<number> {
    return (await this.db.get('sync:block', -1)) as number
  }

  /**
   * Sets the last synced block number.
   * @param block Block number to set.
   */
  public async setLastSyncedBlock(block: number): Promise<void> {
    await this.db.set('sync:block', block)
  }

  /**
   * Returns transactions that failed to sync.
   * @returns An array of encoded transactions.
   */
  public async getFailedTransactions(): Promise<string[]> {
    return (await this.db.get('sync:failed', [])) as string[]
  }

  /**
   * Sets the failed transactions.
   * @param transactions An array of encoded transactions.
   */
  public async setFailedTransactions(transactions: string[]): Promise<void> {
    await this.db.set('sync:failed', transactions)
  }

  /**
   * Marks a set of Ethereum events as seen.
   * @param events Ethereum events.
   */
  public async addEvents(events: EthereumEvent[]): Promise<void> {
    const objects = events.map((event) => {
      return { key: `event:${event.hash}`, value: true }
    })
    await this.db.bulkPut(objects)
  }

  /**
   * Checks if we've seen a specific event
   * @param event An Ethereum event.
   * @returns `true` if we've seen the event, `false` otherwise.
   */
  public async hasEvent(event: EthereumEvent): Promise<boolean> {
    return this.db.exists(`event:${event.hash}`)
  }
}
