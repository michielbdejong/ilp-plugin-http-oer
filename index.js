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
        var promise = (this.opts.port ? new ts_promise_1["default"](function (resolve) {
            _this.server = http_1.createServer(_this.handle.bind(_this));
            _this.server.listen(_this.opts.port, function () {
                logPlugin('listening for http on port ' + _this.opts.port);
                resolve(undefined);
            });
        }) : ts_promise_1["default"].resolve(undefined));
        return promise.then(function () {
            _this._connected = true;
            _this.emit('connect');
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
    Plugin.prototype.handle = function (req, res) {
        var _this = this;
        var chunks = [];
        req.on('data', function (chunk) { chunks.push(chunk); });
        req.on('end', function () {
            logServerRequest(Buffer.concat(chunks));
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
    };
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
    Plugin.prototype.sendMoney = function (amount) { return ts_promise_1["default"].resolve(undefined); };
    Plugin.prototype.registerMoneyHandler = function (handler) { this._moneyHandler = handler; };
    Plugin.prototype.deregisterMoneyHandler = function (handler) { delete this._moneyHandler; };
    return Plugin;
}(eventemitter2_1.EventEmitter2));
Plugin.version = 2;
module.exports = Plugin;
