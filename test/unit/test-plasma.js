const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const core = require('../mock-app')

chai.should()
chai.use(chaiAsPromised)

describe('Plasma Core', () => {
  afterEach(async () => {
    await core.stop()
  })

  it('should run', async () => {
    await core.start().should.eventually.be.fulfilled
  })

  it('should stop', async () => {
    await core.start()
    await core.stop().should.eventually.be.fulfilled
  })
})
