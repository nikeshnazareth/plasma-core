const BaseService = require('../../base-service')

/**
 * Handles sync-related DB calls.
 */
class SyncDB extends BaseService {
  get name () {
    return 'syncdb'
  }

  get dependencies () {
    return ['contract', 'db']
  }

  async _onStart () {
    if (this.services.contract.hasAddress) {
      await this._open()
    } else {
      await new Promise((resolve) => {
        this.services.contract.on('initialized', async () => {
          await this._open()
          resolve()
        })
      })
    }
  }

  async _open () {
    const address = this.services.contract.address
    await this.services.db.open('sync', { id: address })
  }

  /**
   * Returns the last synced block for a given event.
   * @param {string} eventName Name of the event.
   * @return {number} Last synced block number.
   */
  async getLastLoggedEventBlock (eventName) {
    return this.services.db.sync.get(`lastlogged:${eventName}`, -1)
  }

  /**
   * Sets the last synced block for a given event.
   * @param {string} eventName Name of the event.
   * @param {number} block Last synced block number.
   */
  async setLastLoggedEventBlock (eventName, block) {
    await this.services.db.sync.set(`lastlogged:${eventName}`, block)
  }

  /**
   * Returns the last synced block.
   * @return {number} Last synced block number.
   */
  async getLastSyncedBlock () {
    return this.services.db.sync.get('sync:block', -1)
  }

  /**
   * Sets the last synced block number.
   * @param {number} block Block number to set.
   */
  async setLastSyncedBlock (block) {
    await this.services.db.sync.set('sync:block', block)
  }

  /**
   * Returns transactions that failed to sync.
   * @return {Array<string>} An array of encoded transactions.
   */
  async getFailedTransactions () {
    return this.services.db.sync.get('sync:failed', [])
  }

  /**
   * Sets the failed transactions.
   * @param {Array<string>} transactions An array of encoded transactions.
   */
  async setFailedTransactions (transactions) {
    await this.services.db.sync.set('sync:failed', transactions)
  }

  /**
   * Marks a set of Ethereum events as seen.
   * @param {*} events Ethereum events.
   */
  async addEvents (events) {
    const objects = events.map((event) => {
      return {
        key: `event:${event.hash}`,
        value: true
      }
    })
    await this.services.db.sync.bulkPut(objects)
  }

  /**
   * Checks if we've seen a specific event
   * @param {*} event An Ethereum event.
   * @return {boolean} `true` if we've seen the event, `false` otherwise.
   */
  async hasEvent (event) {
    return this.services.db.sync.exists(`event:${event.hash}`)
  }
}

module.exports = SyncDB
