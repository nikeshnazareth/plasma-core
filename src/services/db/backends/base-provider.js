/**
 * Class that DB interfaces must implement.
 */
class BaseDBProvider {
  /**
   * Starts up the database.
   */
  async start () {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Returns the value stored at the given key.
   * @param {string} key Key to query.
   * @param {*} fallback A fallback value if the key doesn't exist.
   * @return {*} The stored value or the fallback.
   */
  async get (key, fallback) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Sets a given key with the value.
   * @param {string} key Key to set.
   * @param {*} value Value to store.
   */
  async set (key, value) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Deletes a given key from storage.
   * @param {string} key Key to delete.
   */
  async delete (key) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Checks if a key exists in storage.
   * @param {string} key Key to check.
   * @return {boolean} `true` if the key exists, `false` otherwise.
   */
  async exists (key) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Finds the next key after a given key.
   * @param {string} key The key to start searching from.
   * @return {string} The next key with the same prefix.
   */
  async findNextKey (key) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Puts a series of objects into the database in bulk.
   * Should be more efficient than simply calling `set` repeatedly.
   * @param {Array<{key: string, value: string}>} objects A series of objects to put into the database.
   */
  async bulkPut (objects) {
    return new Error('Classes that extend BaseDB must implement this method')
  }

  /**
   * Checks if a thing is a valid JSON string.
   * @param {*} str Thing to check.
   * @return {boolean} `true` if it's a JSON string, `false` otherwise.
   */
  _isJson (str) {
    try {
      JSON.parse(str)
    } catch (err) {
      return false
    }
    return true
  }
}

module.exports = BaseDBProvider
