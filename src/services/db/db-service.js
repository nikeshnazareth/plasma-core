const BaseService = require('../base-service.js')
const EphemDBProvider = require('./backends/ephem-provider.js')

class DBService extends BaseService {
  async openDB (dbName) {
    this[dbName] = new EphemDBProvider()
  }

  get name () {
    return 'DBService'
  }
}

module.exports = DBService
