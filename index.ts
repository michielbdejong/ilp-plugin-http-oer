import { EventEmitter2 } from 'eventemitter2'
import { deserializeIlpPacket, serializeIlpPrepare, deserializeIlpPrepare, serializeIlpFulfill, serializeIlpReject, Type, IlpFulfill, IlpRejection /* == IlpReject */ } from 'ilp-packet'
import { createServer } from 'http'
import { fetch } from 'node-fetch'
import * as Debug from 'debug'
import Promise from 'ts-promise'

const logPlugin = Debug('ilp-plugin-http')
const logServerRequest = Debug('Server Request')
const logClientRequest = Debug('Client-Request')
const logClientResponse = Debug('Client-Response')
const logServerResponse = Debug('Server.Response')


class Plugin extends EventEmitter2 {
  opts: any
  server: any
  _dataHandler: Function
  _connected: Boolean
  static version: Number

  constructor (opts) {
    super()
    this.opts = opts
  }

  connect () {
    this.server = createServer((req, res) => {
      let chunks = []
      req.on('data', (chunk) => { chunks.push(chunk) })
      req.on('end', () => {
        logServerRequest(req.headers, Buffer.concat(chunks))
        // Convert from ilp-packet object field names described in:
        // https://github.com/interledger/rfcs/blob/de237e8b9250d83d5e9d9dec58e7aca88c887b57/0000-ilp-over-http.md#request
        // to the http header names described in:
        // https://github.com/interledgerjs/ilp-packet/blob/7724aa28330d567e0afc9512ab966d11a0d19d3c/README.md#ilpprepare-ilpfulfill-ilpreject
        Promise.resolve().then(() => {
          return this._dataHandler(Buffer.concat(chunks))
        }).then(response => {
          return res.end(response)
        }).catch(err => {
          logServerResponse(500, err)
          res.writeHead(500)
          res.end(err.message) // only for debugging, you probably want to disable this line in production
        })
      })
    })
    return new Promise(resolve => {
      this.server.listen(this.opts.port, () => {
        logPlugin('listening for http on port ' + this.opts.port)
        this._connected = true
        this.emit('connect')
        resolve(undefined)
      })
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
}
Plugin.version = 2
module.exports = Plugin
