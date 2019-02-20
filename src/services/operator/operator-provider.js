const axios = require('axios')
const uuidv4 = require('uuid/v4')
const BigNum = require('bn.js')

/* Models */
const utils = require('plasma-utils')
const models = utils.serialization.models
const UnsignedTransaction = models.UnsignedTransaction
const SignedTransaction = models.SignedTransaction
const TransferProof = models.TransferProof

const BaseOperatorProvider = require('./base-provider')

const defaultOptions = {
  operatorPingInterval: 10000
}

/**
 * Service that wraps the interface to the operator.
 */
class OperatorProvider extends BaseOperatorProvider {
  constructor (options) {
    super(options, defaultOptions)
    this.online = false
  }

  get dependencies () {
    return ['contract']
  }

  async _onStart () {
    this.services.contract.on('initialized', () => {
      this._initConnection()
    })
    this._pingInterval()
  }

  async getNextBlock () {
    return parseInt(await this._handle('getBlockNumber'))
  }

  async getEthInfo () {
    return this._handle('getEthInfo')
  }

  async getTransactions (address, startBlock, endBlock) {
    const txs = await this._handle('getTransactions', [
      address,
      startBlock,
      endBlock
    ])
    return txs.map((tx) => {
      return Buffer.from(tx).toString('hex')
    })
  }

  async getTransaction (encoded) {
    // TODO: Use the transaction hash instead of encoded.
    const tx = new SignedTransaction(encoded)
    const rawProof = await this._handle('getHistoryProof', [
      0,
      tx.block,
      encoded
    ])

    const deposits = rawProof.deposits
      .map((deposit) => {
        const transfer = deposit.transfers[0]
        return {
          block: new BigNum(deposit.block, 'hex'),
          token: new BigNum(transfer.token, 'hex'),
          start: new BigNum(transfer.start, 'hex'),
          end: new BigNum(transfer.end, 'hex'),
          owner: transfer.recipient
        }
      })
      .sort((a, b) => {
        return a.start.sub(b.start)
      })
      .reduce((a, b) => {
        // Remove any duplicates.
        if (a.length === 0 || a.slice(-1)[0].start !== b.start) a.push(b)
        return a
      }, [])

    const earliestBlock = deposits
      .reduce((a, b) => {
        return a.block.lt(b.block) ? a : b
      })
      .block.toNumber()

    const nonEmptyBlocks = Object.keys(rawProof.transactionHistory).map((i) => {
      return parseInt(i)
    })

    const emptyProofs = []
    for (let i = earliestBlock + 1; i < Math.max(...nonEmptyBlocks); i++) {
      if (!nonEmptyBlocks.includes(i)) {
        emptyProofs.push({
          transaction: {
            block: new BigNum(i, 10),
            transfers: []
          },
          transactionProof: {
            transferProofs: []
          }
        })
      }
    }

    const txProofs = nonEmptyBlocks
      .sort((a, b) => {
        return new BigNum(a, 10).sub(new BigNum(b, 10))
      })
      .reduce((proofs, block) => {
        return proofs.concat(rawProof.transactionHistory[block])
      }, [])
      .concat(emptyProofs)
      .map((txProof) => {
        return {
          transaction: new UnsignedTransaction(txProof.transaction),
          proof: txProof.transactionProof.transferProofs.map(
            (transferProof) => {
              return new TransferProof(transferProof)
            }
          )
        }
      })
      .sort((a, b) => {
        return a.transaction.block.sub(b.transaction.block)
      })

    return {
      transaction: tx,
      proof: txProofs,
      deposits: deposits
    }
  }

  async sendTransaction (transaction) {
    const tx = new SignedTransaction(transaction)
    return this._handle('addTransaction', [tx.encoded])
  }

  async submitBlock () {
    return this._handle('newBlock')
  }

  /**
   * Initializes the connection to the operator.
   * Must wait until the contract to pull operator info.
   */
  async _initConnection () {
    this.endpoint = this.services.contract.operatorEndpoint
    this.http = axios.create({
      baseURL: this.endpoint.startsWith('http')
        ? this.endpoint
        : `https://${this.endpoint}`
    })
  }

  /**
   * Sends a JSON-RPC command as a HTTP POST request.
   * @param {string} method Name of the method to call.
   * @param {Array} params Any extra parameters.
   * @return {*} The result of the operation or an error.
   */
  async _handle (method, params = []) {
    let response
    try {
      response = await this.http.post('/', {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: uuidv4()
      })
    } catch (err) {
      this.log(`ERROR: ${err}`)
      throw err
    }
    const data = utils.utils.isString(response)
      ? JSON.parse(response.data)
      : response.data
    if (data.error) {
      throw data.error
    }
    return data.result
  }

  /**
   * Regularly pings the operator to check if it's online.
   */
  async _pingInterval () {
    try {
      if (this.endpoint) {
        await this.getEthInfo()
        if (!this.online) {
          this.log('Successfully connected to operator')
        }
        this.online = true
      }
    } catch (err) {
      this.online = false
      this.log('ERROR: Cannot connect to operator. Attempting to reconnect...')
    } finally {
      await utils.utils.sleep(this.options.operatorPingInterval)
      this._pingInterval()
    }
  }
}

module.exports = OperatorProvider
