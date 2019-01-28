const BigNum = require('bn.js')
const BaseContractProvider = require('./base-provider')
const plasmaChainCompiled = require('plasma-contracts').plasmaChainCompiled

// TODO: Rename this.
class HttpContractProvider extends BaseContractProvider {
  async start () {
    this.started = true
    this.initContract()
    this.services.eventWatcher.subscribe('DepositEvent', (event) => {
      const values = event.returnValues
      this.emitContractEvent('Deposit', {
        owner: values.depositer,
        start: new BigNum(values.untypedStart),
        end: new BigNum(values.untypedEnd),
        token: new BigNum(values.tokenType)
      })
    })
  }

  async stop () {
    this.started = false
    this.removeAllListeners()
  }

  initContract () {
    if (this.contract) return
    this.contract = new this.services.web3.eth.Contract(plasmaChainCompiled.abi)
  }

  // TODO: Fix this for ERC20 support.
  async deposit (token, amount, owner) {
    return this.contract.methods.depositETH().send({
      from: owner,
      value: amount,
      gas: 6000000 // TODO: Figure out how much this should be.
    })
  }

  // TODO: Rewrite when we add generic signature support.
  async submitBlock (hash) {
    return this.contract.methods.submitBlock(hash).send({
      from: await this.getOperator()
    })
  }

  async depositValid (deposit) {
    return true
  }

  async getBlock (block) {
    return this.contract.methods.blockHashes(block).call()
  }

  async getCurrentBlock () {
    const nextBlockNumber = await this.contract.methods
      .nextPlasmaBlockNumber()
      .call()
    return nextBlockNumber - 1
  }

  async getOperator () {
    return this.contract.methods.operator().call()
  }
}

module.exports = HttpContractProvider
