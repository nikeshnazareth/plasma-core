import { utils } from 'plasma-utils'

export type DBResult =
  | string
  | string[]
  | object
  | object[]
  | number
  | number[]
  | boolean
export type DBValue = string | {}
export interface DBObject {
  key: string
  value: DBValue
}

/**
 * Class that DB interfaces must implement.
 */
export class BaseDBProvider {
  options: {}

  constructor(options = {}) {
    this.options = options
  }

  /**
   * Starts up the database.
   */
  async start(): Promise<void> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Returns the value stored at the given key.
   * @param key Key to query.
   * @param fallback A fallback value if the key doesn't exist.
   * @returns the stored value or the fallback.
   */
  async get<T>(key: string, fallback?: T): Promise<T | DBResult> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Sets a given key with the value.
   * @param key Key to set.
   * @param value Value to store.
   */
  async set(key: string, value: DBValue): Promise<void> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Deletes a given key from storage.
   * @param key Key to delete.
   */
  async delete(key: string): Promise<void> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Checks if a key exists in storage.
   * @param key Key to check.
   * @returns `true` if the key exists, `false` otherwise.
   */
  async exists(key: string): Promise<boolean> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Finds the next key after a given key.
   * @param key The key to start searching from.
   * @returns the next key with the same prefix.
   */
  async findNextKey(key: string): Promise<string> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Puts a series of objects into the database in bulk.
   * Should be more efficient than simply calling `set` repeatedly.
   * @param objects A series of objects to put into the database.
   */
  async bulkPut(objects: DBObject[]): Promise<void> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Pushes to an array stored at a key in the database.
   * @param key The key at which the array is stored.
   * @param value Value to add to the array.
   */
  async push<T>(key: string, value: T): Promise<void> {
    throw new Error('Classes that extend BaseDB must implement this method.')
  }

  /**
   * Converts a value into a string.
   * @param value Value to convert.
   * @returns the stringified value.
   */
  stringify(value: DBValue): string {
    if (!utils.isString(value)) {
      value = JSON.stringify(value)
    }
    return value as string
  }

  /**
   * Converts a value into a JSON object.
   * @param value Value to convert.
   * @returns the JSON-ified value.
   */
  jsonify(value: string): {} {
    return this.isJson(value) ? JSON.parse(value) : value
  }

  /**
   * Checks if a thing is a valid JSON string.
   * @param value Thing to check.
   * @returns `true` if it's a JSON string, `false` otherwise.
   */
  isJson(value: string): boolean {
    try {
      JSON.parse(value)
    } catch (err) {
      return false
    }
    return true
  }
}
