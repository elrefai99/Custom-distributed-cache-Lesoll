"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elrefaiNode = void 0;
const ws_1 = __importStar(require("ws"));
const uuid_1 = require("uuid");
const local_cache_1 = require("./local-cache");
const consistent_hash_1 = require("./consistent-hash");
class elrefaiNode {
    constructor(options) {
        var _a;
        this.options = options;
        this.peers = new Map();
        this.pendingRequests = new Map();
        this.heartbeatInterval = null;
        this.nodeId = (_a = options.nodeId) !== null && _a !== void 0 ? _a : (0, uuid_1.v4)().split('-').join('');
        this.cache = new local_cache_1.LocalCache(this.nodeId);
        this.ring = new consistent_hash_1.ConsistentHashRing();
        this.ring.addNode(this.nodeId);
        this.wss = new ws_1.WebSocketServer({ host: options.host, port: options.port });
        this.wss.on('connection', (ws) => this.handleConnection(ws));
        this.startHeartbeat();
        console.log(`[${this.nodeId}] Node started on ${options.host}:${options.port}`);
    }
    set(key, value, ttlMs) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const replicationFactor = (_a = this.options.replicationFactor) !== null && _a !== void 0 ? _a : 2;
            const targetNodes = this.ring.getNodes(key, replicationFactor);
            if (targetNodes.includes(this.nodeId)) {
                this.cache.set(key, value, ttlMs);
            }
            const msg = {
                type: 'SET',
                sender: this.nodeId,
                payload: { key, value, ttlMs },
            };
            for (const nodeId of targetNodes) {
                if (nodeId !== this.nodeId) {
                    this.sendToPeer(nodeId, msg);
                }
            }
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const local = this.cache.get(key);
            if (local !== null)
                return local;
            const targetNode = this.ring.getNode(key);
            if (!targetNode || targetNode === this.nodeId)
                return null;
            return this.remoteGet(targetNode, key);
        });
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cache.delete(key);
            const msg = {
                type: 'DELETE',
                sender: this.nodeId,
                payload: { key },
            };
            this.broadcast(msg);
        });
    }
    connectToPeer(host, port) {
        const ws = new ws_1.default(`ws://${host}:${port}`);
        ws.on('open', () => {
            const joinMsg = {
                type: 'NODE_JOIN',
                sender: this.nodeId,
                payload: { host: this.options.host, port: this.options.port },
            };
            ws.send(JSON.stringify(joinMsg));
        });
        ws.on('message', (data) => this.handleMessage(ws, data.toString()));
        ws.on('error', (err) => console.error(`[${this.nodeId}] Peer error:`, err.message));
    }
    handleConnection(ws) {
        ws.on('message', (data) => this.handleMessage(ws, data.toString()));
        ws.on('close', () => this.handleDisconnect(ws));
    }
    handleMessage(ws, raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch (_a) {
            return;
        }
        switch (msg.type) {
            case 'NODE_JOIN': {
                const { host, port } = msg.payload;
                const nodeInfo = {
                    id: msg.sender,
                    host,
                    port,
                    status: 'alive',
                    lastSeen: Date.now(),
                };
                this.peers.set(msg.sender, { info: nodeInfo, ws });
                this.ring.addNode(msg.sender);
                console.log(`[${this.nodeId}] Peer joined: ${msg.sender}`);
                this.sendToPeerWs(ws, {
                    type: 'SYNC_RESPONSE',
                    sender: this.nodeId,
                    payload: Object.fromEntries(this.cache.getAll()),
                });
                break;
            }
            case 'SYNC_RESPONSE': {
                const entries = msg.payload;
                for (const [key, entry] of Object.entries(entries)) {
                    const existing = this.cache.getEntry(key);
                    const incoming = entry;
                    if (!existing || incoming.version > existing.version) {
                        this.cache.setEntry(key, incoming);
                    }
                }
                break;
            }
            case 'SET': {
                const { key, value, ttlMs } = msg.payload;
                this.cache.set(key, value, ttlMs);
                break;
            }
            case 'DELETE': {
                const { key } = msg.payload;
                this.cache.delete(key);
                break;
            }
            case 'GET': {
                const { key } = msg.payload;
                const value = this.cache.get(key);
                this.sendToPeerWs(ws, {
                    type: 'GET_RESPONSE',
                    sender: this.nodeId,
                    requestId: msg.requestId,
                    payload: { key, value },
                });
                break;
            }
            case 'GET_RESPONSE': {
                const { value } = msg.payload;
                if (msg.requestId) {
                    const resolve = this.pendingRequests.get(msg.requestId);
                    if (resolve) {
                        resolve(value);
                        this.pendingRequests.delete(msg.requestId);
                    }
                }
                break;
            }
            case 'HEARTBEAT': {
                const peer = this.peers.get(msg.sender);
                if (peer)
                    peer.info.lastSeen = Date.now();
                break;
            }
        }
    }
    handleDisconnect(ws) {
        for (const [id, peer] of this.peers) {
            if (peer.ws === ws) {
                this.peers.delete(id);
                this.ring.removeNode(id);
                console.log(`[${this.nodeId}] Peer disconnected: ${id}`);
                break;
            }
        }
    }
    remoteGet(nodeId, key) {
        return new Promise((resolve) => {
            const requestId = (0, uuid_1.v4)().split('-').join('');
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                resolve(null);
            }, 3000);
            this.pendingRequests.set(requestId, (value) => {
                clearTimeout(timeout);
                resolve(value);
            });
            this.sendToPeer(nodeId, {
                type: 'GET',
                sender: this.nodeId,
                requestId,
                payload: { key },
            });
        });
    }
    sendToPeer(nodeId, msg) {
        const peer = this.peers.get(nodeId);
        if ((peer === null || peer === void 0 ? void 0 : peer.ws.readyState) === ws_1.default.OPEN) {
            peer.ws.send(JSON.stringify(msg));
        }
    }
    sendToPeerWs(ws, msg) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }
    broadcast(msg) {
        for (const { ws } of this.peers.values()) {
            this.sendToPeerWs(ws, msg);
        }
    }
    startHeartbeat() {
        var _a;
        const interval = (_a = this.options.heartbeatIntervalMs) !== null && _a !== void 0 ? _a : 5000;
        this.heartbeatInterval = setInterval(() => {
            this.broadcast({
                type: 'HEARTBEAT',
                sender: this.nodeId,
                payload: {},
            });
        }, interval);
    }
    getStats() {
        return Object.assign(Object.assign({}, this.cache.getStats()), { peers: [...this.peers.keys()], ringNodes: this.ring.getNodes('__probe__', 10) });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.heartbeatInterval)
                clearInterval(this.heartbeatInterval);
            this.cache.destroy();
            this.wss.close();
        });
    }
}
exports.elrefaiNode = elrefaiNode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtbm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb3JlL2NhY2hlLW5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQWdEO0FBQ2hELCtCQUFrQztBQUNsQywrQ0FBMkM7QUFDM0MsdURBQXVEO0FBV3ZELE1BQWEsV0FBVztJQVNuQixZQUE2QixPQUF5Qjs7UUFBekIsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7UUFMOUMsVUFBSyxHQUFHLElBQUksR0FBRyxFQUE2QyxDQUFDO1FBRTdELG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7UUFDOUQsc0JBQWlCLEdBQTBCLElBQUksQ0FBQztRQUduRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQUEsT0FBTyxDQUFDLE1BQU0sbUNBQUksSUFBQSxTQUFJLEdBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSx3QkFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksb0NBQWtCLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFL0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLG9CQUFlLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFD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