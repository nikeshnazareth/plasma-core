const BaseService = require('../base-service.js')
const EphemDBProvider = require('./backends/ephem-provider.js')

const defaultOptions = {
  dbProvider: EphemDBProvider
}

class DBService extends BaseService {
  constructor (options) {
    super(options, defaultOptions)
  }

  async open (dbName, dbOptions, DBProvider = this.options.dbProvider) {
    if (dbName in this) return

    const db = new DBProvider({
      ...{ name: dbName },
      ...dbOptions
    })
    await db.start()
    this[dbName] = db
  }

  get name () {
    return 'db'
  }
}

module.exports = DBService
