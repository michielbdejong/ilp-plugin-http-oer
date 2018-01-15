"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var eventemitter2_1 = require("eventemitter2");
var ilp_packet_1 = require("ilp-packet");
var http_1 = require("http");
var node_fetch_1 = require("node-fetch");
var Debug = require("debug");
var ts_promise_1 = require("ts-promise");
var logPlugin = Debug('ilp-plugin-http');
var logServerRequest = Debug('Server Request');
var logClientRequest = Debug('Client-Request');
var logClientResponse = Debug('Client-Response');
var logServerResponse = Debug('Server.Response');
var Plugin = /** @class */ (function (_super) {
    __extends(Plugin, _super);
    function Plugin(opts) {
        var _this = _super.call(this) || this;
        _this.opts = opts;
        return _this;
    }
    Plugin.prototype.connect = function () {
        var _this = this;
        this.server = http_1.createServer(function (req, res) {
            var chunks = [];
            req.on('data', function (chunk) { chunks.push(chunk); });
            req.on('end', function () {
                logServerRequest(Buffer.concat(chunks));
                // Convert from ilp-packet object field names described in:
                // https://github.com/interledger/rfcs/blob/de237e8b9250d83d5e9d9dec58e7aca88c887b57/0000-ilp-over-http.md#request
                // to the http header names described in:
                // https://github.com/interledgerjs/ilp-packet/blob/7724aa28330d567e0afc9512ab966d11a0d19d3c/README.md#ilpprepare-ilpfulfill-ilpreject
                ts_promise_1["default"].resolve().then(function () {
                    return _this._dataHandler(Buffer.concat(chunks));
                }).then(function (response) {
                    logServerResponse(200, response);
                    return res.end(response);
                })["catch"](function (err) {
                    logServerResponse(500, err);
                    res.writeHead(500);
                    res.end(err.message); // only for debugging, you probably want to disable this line in production
                });
            });
        });
        return new ts_promise_1["default"](function (resolve) {
            _this.server.listen(_this.opts.port, function () {
                logPlugin('listening for http on port ' + _this.opts.port);
                _this._connected = true;
                _this.emit('connect');
                resolve(undefined);
            });
        });
    };
    Plugin.prototype.disconnect = function () {
        var _this = this;
        return new ts_promise_1["default"](function (resolve) { return _this.server.close(function () {
            _this._connected = false;
            _this.emit('disconnect');
            resolve(undefined);
        }); });
    };
    Plugin.prototype.isConnected = function () { return this._connected; };
    Plugin.prototype.sendData = function (packet) {
        logClientRequest(packet);
        return node_fetch_1["default"](this.opts.peerUrl, {
            method: 'POST',
            body: packet
        }).then(function (res) {
            return res.buffer().then(function (body) {
                logClientResponse(res.status, body);
                return body;
            });
        })["catch"](function (err) {
            return ilp_packet_1.serializeIlpReject({
                code: 'P00',
                // name:          'plugin bug',
                triggeredBy: 'ilp-plugin-http',
                // triggeredAt:   new Date(),
                message: err.message,
                data: Buffer.from([])
            });
        });
    };
    Plugin.prototype.registerDataHandler = function (handler) { this._dataHandler = handler; };
    Plugin.prototype.deregisterDataHandler = function (handler) { delete this._dataHandler; };
    return Plugin;
}(eventemitter2_1.EventEmitter2));
Plugin.version = 2;
module.exports = Plugin;
