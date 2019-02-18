const BaseService = require('base-service.js')
const EphemDBProvider = require('./db/ephem-provider.js')

class DBService extends BaseService {
  async openDB (name) {
    this[name] = new EphemDBProvider()
  }

  get name () {
    return 'DBService'
  }
}

module.exports = DBService
