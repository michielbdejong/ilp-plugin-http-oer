import { EventEmitter2 } from 'eventemitter2'
import { deserializeIlpPacket, serializeIlpPrepare, deserializeIlpPrepare, serializeIlpFulfill, serializeIlpReject, Type, IlpFulfill, IlpRejection /* == IlpReject */ } from 'ilp-packet'
import { createServer } from 'http'
import fetch from 'node-fetch'
import * as Debug from 'debug'
// import Promise from 'ts-promise'

const logPlugin = Debug('ilp-plugin-http')
const logServerRequest = Debug('Server Request')
const logClientRequest = Debug('Client-Request')
const logClientResponse = Debug('Client-Response')
const logServerResponse = Debug('Server.Response')


class Plugin extends EventEmitter2 {
  opts: any
  server: any
  _dataHandler: Function
  _moneyHandler: Function
  _connected: Boolean
  static version: Number

  constructor (opts) {
    super()
    this.opts = opts
  }

  connect () {
    const promise = (this.opts.port ? new Promise(resolve => {
        this.server = createServer(this.handle.bind(this))
        this.server.listen(this.opts.port, () => {
          logPlugin('listening for http on port ' + this.opts.port)
          resolve(undefined)
        })
      }) : Promise.resolve(undefined))
    return promise.then(() => {
      this._connected = true
      this.emit('connect')
    })
  }
  disconnect () {
    return new Promise(resolve => this.server.close(() => {
      this._connected = false
      this.emit('disconnect')
      resolve(undefined)
    }))
  }
  isConnected () { return this._connected }

  handle(req, res) {
    let chunks = []
    req.on('data', (chunk) => { chunks.push(chunk) })
    req.on('end', () => {
      logServerRequest(Buffer.concat(chunks))
      Promise.resolve().then(() => {
        return this._dataHandler(Buffer.concat(chunks))
      }).then(response => {
        logServerResponse(200, response)
        return res.end(response)
      }).catch(err => {
        logServerResponse(500, err)
        res.writeHead(500)
        res.end(err.message) // only for debugging, you probably want to disable this line in production
      })
    })
  }

  sendData (packet) {
    logClientRequest(packet)
    return fetch(this.opts.peerUrl, {
      method: 'POST',
      body: packet
    }).then(res => {
      return res.buffer().then(body => {
        logClientResponse(res.status, body)
        return body
      })
    }).catch(err => {
      return serializeIlpReject({
        code:          'P00',
        // name:          'plugin bug',
        triggeredBy:   'ilp-plugin-http',
        // triggeredAt:   new Date(),
        message:       err.message,
        data: Buffer.from([])
      })
    })
  }

  registerDataHandler (handler) { this._dataHandler = handler }
  deregisterDataHandler (handler) { delete this._dataHandler }
  sendMoney (amount) { return Promise.resolve(undefined) }
  registerMoneyHandler (handler) { this._moneyHandler = handler }
  deregisterMoneyHandler (handler) { delete this._moneyHandler }
}
Plugin.version = 2
module.exports = Plugin
