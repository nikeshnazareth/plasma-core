import { BaseService, ServiceOptions } from '../base-service'
import { BaseDBProvider } from './backends/base-provider'
import { EphemDBProvider } from './backends/ephem-provider'

export interface UserDBOptions {
  dbProvider?: typeof BaseDBProvider
}

interface DBOptions extends ServiceOptions {
  dbProvider: typeof BaseDBProvider
}

interface DefaultDBOptions {
  dbProvider: typeof BaseDBProvider
}

const defaultOptions: DefaultDBOptions = {
  dbProvider: EphemDBProvider,
}

export class DBService extends BaseService {
  options!: DBOptions
  dbs: { [key: string]: BaseDBProvider } = {}

  constructor(options: UserDBOptions & ServiceOptions) {
    super(options, defaultOptions)
  }

  /**
   * Opens a new database with the given name.
   * @param name Name of the new database.
   * @param options Any additional options to the provider.
   * @param provider The database provider.
   */
  async open(
    name: string,
    options: {} = {},
    provider = this.options.dbProvider
  ): Promise<void> {
    if (name in this) return

    const db = new provider({ ...{ name }, ...options })
    await db.start()
    this.dbs[name] = db
  }
}
