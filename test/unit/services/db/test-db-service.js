const chai = require('chai')
const should = chai.should()

const DBService = require('../../../../src/services/db/db-service.js')

describe('DBService', () => {
  describe('Core', () => {
    const dbs = new DBService()

    it('should open a DB', async () => {
      const expected = 'dbname'
      await dbs.open(expected)
      should.exist(dbs[expected])
    })

    it('should open two DBs', async () => {
      const db1Name = 'db1'
      const db2Name = 'db2'
      await dbs.open(db1Name)
      should.exist(dbs[db1Name])

      await dbs.open(db2Name)
      should.exist(dbs[db2Name])
    })
  })

  describe('Database', () => {
    let db
    before(async () => {
      const dbs = new DBService()
      const dbname = 'dbname'
      await dbs.open(dbname)
      db = dbs[dbname]
    })

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

  describe('Multiple Databases', () => {
    let db1, db2
    before(async () => {
      const dbs = new DBService()

      const db1Name = 'db1'
      const db2Name = 'db2'

      await dbs.open(db1Name)
      await dbs.open(db2Name)

      db1 = dbs[db1Name]
      db2 = dbs[db2Name]
    })

    it('should add two same keys with different items to two different databases', async () => {
      // Set 1st DB's value, check if consistent.
      const valA = 'A'
      await db1.set('key', valA)
      const db1Val = await db1.get('key')
      db1Val.should.equal(valA)

      // Set 2nd DB's value, check if consistent.
      const valB = 'B'
      await db2.set('key', valB)
      const db2Val = await db2.get('key')
      db2Val.should.equal(valB)

      // Check to see that both values are still equal.
      const db1ValCheck = await db1.get('key')
      const db2ValCheck = await db2.get('key')
      db1ValCheck.should.equal(valA)
      db2ValCheck.should.equal(valB)
    })

    it('should remove an item with the same key from only one database', async () => {
      // Set 1st DB's value.
      const valA = 'A'
      await db1.set('key', valA)

      // Set 2nd DB's value at key.
      const valB = 'B'
      await db2.set('key', valB)

      // Delete key from 1st DB.
      await db1.delete('key')

      // Check if key successfully removed from 1st DB.
      await db1.get('key').should.be.rejectedWith('Key not found in database')

      // Check if item with same key name still exists in 2nd DB.
      const db2Val = await db2.get('key')
      should.exist(db2Val)
      db2Val.should.equal(valB)
    })
  })
})
