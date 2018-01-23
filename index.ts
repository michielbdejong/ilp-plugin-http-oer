import { EventEmitter2 } from 'eventemitter2'
import { createServer, ServerRequest, ServerResponse } from 'http'
import fetch from 'node-fetch'
import * as Debug from 'debug'
const debug = Debug('ilp-plugin-http')

export interface PluginHttpOerOpts {
  port?: number,
  peerUrl: string
}

export interface DataHandler {
  (data: Buffer): Promise<Buffer>
}

export interface MoneyHandler {
  (amount: string): Promise<void>
}

export default class PluginHttpOer extends EventEmitter2 {
  protected port?: number
  protected peerUrl: string
  protected server: any
  protected dataHandler: DataHandler
  protected moneyHandler: MoneyHandler
  protected connected: Boolean
  static readonly version = 2

  constructor (opts: PluginHttpOerOpts) {
    super()
    this.port = opts.port
    this.peerUrl = opts.peerUrl
    this.dataHandler = defaultDataHandler
    this.moneyHandler = defaultMoneyHandler
  }

  async connect (): Promise<void> {
    if (this.port) {
      this.server = createServer(this.handle.bind(this))
      await new Promise((resolve, reject) => {
        this.server.listen(this.port, (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
      debug('connected and listening for http on port ' + this.port)
      this.connected = true
      this.emit('connect')
    }
  }

  async disconnect (): Promise<void> {
    await new Promise((resolve, reject) => {
      this.server.close((err: any) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    debug('disconnected')
    this.connected = false
    this.emit('disconnect')
  }

  isConnected (): Boolean {
    return this.connected
  }

  protected handle(req: ServerRequest, res: ServerResponse): void {
    let chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => { chunks.push(chunk) })
    req.on('end', async () => {
      try {
        const responseToSend = await this.dataHandler(Buffer.concat(chunks))
        res.end(responseToSend)
      } catch (err) {
        debug('error handling data:', err)
        res.writeHead(500)
        res.end()
      }
    })
  }

  async sendData (packet: Buffer): Promise<Buffer> {
    const response = await fetch(this.peerUrl, {
      method: 'POST',
      body: packet
    })
    return response.buffer()
  }

  async sendMoney (amount: string) {
    // TODO implement something here
    return
  }

  registerDataHandler (handler: DataHandler) { this.dataHandler = handler }
  deregisterDataHandler () { this.dataHandler = defaultDataHandler }
  registerMoneyHandler (handler: MoneyHandler) { this.moneyHandler = handler }
  deregisterMoneyHandler () { this.moneyHandler = defaultMoneyHandler }
}

async function defaultDataHandler (data: Buffer): Promise<Buffer> {
  const error = new Error('no data handler registered')
  error.name = 'NoDataHandlerError'
  throw error
}

async function defaultMoneyHandler (amount: string): Promise<void> {
  return
}

// Support both the Node.js and ES6 module exports
const es6Exports = exports
module.exports = PluginHttpOer
Object.assign(module.exports, es6Exports)