const chai = require('chai')
const should = chai.should()

const DBService = require('../../../../src/services/db/db-service.js')
const EphemDBProvider = require('../../../../src/services/db/backends/ephem-provider')


describe('DBService Core', async() => {
  const dbs = new DBService()

  it('should open a DB', async () => {    
    const expected = 'dbname'
    await dbs.openDB(expected)
    should.exist(dbs[expected])
  })

  it('should open a DB', async () => {    
    const db1Name = 'db1'
    const db2Name = 'db2'
    await dbs.openDB(db1Name)
    should.exist(dbs[db1Name])

    await dbs.openDB(db2Name)
    should.exist(dbs[db2Name])
  })



})

describe('DBService Databases', async () => {
  const dbs = new DBService()
  const dbname = 'dbname'
  await dbs.openDB(dbname)
  const db = dbs[dbname]

  it('should add a new item to the database', async () => {
    
    const expected = 'value'
    await db.set('key', expected)
    const value = await db.get('key')

    value.should.equal(expected)
  })

  it('should remove an item from the database', async () => {
    const expected = 'value'
    await db.set('key', expected)
    await db.delete('key')

    await db.get('key').should.be.rejectedWith('Key not found in database')
  })

  it('should check if an item exists', async () => {
    const expected = 'value'
    await db.set('key', expected)
    const exists = await db.exists('key')

    exists.should.be.true
  })

  it('should have a key not exist if it was removed', async () => {
    const expected = 'value'
    await db.set('key', expected)
    await db.delete('key')
    const exists = await db.exists('key')

    exists.should.be.false
  })
})
