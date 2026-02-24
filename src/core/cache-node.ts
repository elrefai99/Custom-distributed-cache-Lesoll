import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
import { LocalCache } from './local-cache';
import { ConsistentHashRing } from './consistent-hash';
import { CacheMessage, NodeInfo, SetPayload, GetPayload } from '../@types';

export interface CacheNodeOptions {
     nodeId?: string;
     host: string;
     port: number;
     replicationFactor?: number;
     heartbeatIntervalMs?: number;
}

export class elrefaiNode {
     readonly nodeId: string;
     private cache: LocalCache;
     private ring: ConsistentHashRing;
     private peers = new Map<string, { info: NodeInfo; ws: WebSocket }>();
     private wss: WebSocketServer;
     private pendingRequests = new Map<string, (value: unknown) => void>();
     private heartbeatInterval: NodeJS.Timeout | null = null;

     constructor(private readonly options: CacheNodeOptions) {
          this.nodeId = options.nodeId ?? uuid().split('-').join('');
          this.cache = new LocalCache(this.nodeId);
          this.ring = new ConsistentHashRing();
          this.ring.addNode(this.nodeId);

          this.wss = new WebSocketServer({ host: options.host, port: options.port });
          this.wss.on('connection', (ws) => this.handleConnection(ws));
          this.startHeartbeat();

          console.log(`[${this.nodeId}] Node started on ${options.host}:${options.port}`);
     }

     async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
          const replicationFactor = this.options.replicationFactor ?? 2;
          const targetNodes = this.ring.getNodes(key, replicationFactor);

          if (targetNodes.includes(this.nodeId)) {
               this.cache.set(key, value, ttlMs);
          }

          const msg: CacheMessage = {
               type: 'SET',
               sender: this.nodeId,
               payload: { key, value, ttlMs } as SetPayload,
          };

          for (const nodeId of targetNodes) {
               if (nodeId !== this.nodeId) {
                    this.sendToPeer(nodeId, msg);
               }
          }
     }

     async get<T>(key: string): Promise<T | null> {
          const local = this.cache.get<T>(key);
          if (local !== null) return local;

          const targetNode = this.ring.getNode(key);
          if (!targetNode || targetNode === this.nodeId) return null;

          return this.remoteGet<T>(targetNode, key);
     }

     async delete(key: string): Promise<void> {
          this.cache.delete(key);

          const msg: CacheMessage = {
               type: 'DELETE',
               sender: this.nodeId,
               payload: { key },
          };

          this.broadcast(msg);
     }

     connectToPeer(host: string, port: number): void {
          const ws = new WebSocket(`ws://${host}:${port}`);

          ws.on('open', () => {
               const joinMsg: CacheMessage = {
                    type: 'NODE_JOIN',
                    sender: this.nodeId,
                    payload: { host: this.options.host, port: this.options.port },
               };
               ws.send(JSON.stringify(joinMsg));
          });

          ws.on('message', (data) => this.handleMessage(ws, data.toString()));
          ws.on('error', (err) => console.error(`[${this.nodeId}] Peer error:`, err.message));
     }

     private handleConnection(ws: WebSocket): void {
          ws.on('message', (data) => this.handleMessage(ws, data.toString()));
          ws.on('close', () => this.handleDisconnect(ws));
     }

     private handleMessage(ws: WebSocket, raw: string): void {
          let msg: CacheMessage;
          try { msg = JSON.parse(raw); } catch { return; }

          switch (msg.type) {
               case 'NODE_JOIN': {
                    const { host, port } = msg.payload as NodeInfo;
                    const nodeInfo: NodeInfo = {
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
                    const entries = msg.payload as Record<string, unknown>;
                    for (const [key, entry] of Object.entries(entries)) {
                         const existing = this.cache.getEntry(key);
                         const incoming = entry as { version: number; value: unknown; expiresAt: number | null; createdAt: number };
                         // Last-write-wins via version number
                         if (!existing || incoming.version > existing.version) {
                              this.cache.setEntry(key, incoming);
                         }
                    }
                    break;
               }

               case 'SET': {
                    const { key, value, ttlMs } = msg.payload as SetPayload;
                    this.cache.set(key, value, ttlMs);
                    break;
               }

               case 'DELETE': {
                    const { key } = msg.payload as { key: string };
                    this.cache.delete(key);
                    break;
               }

               case 'GET': {
                    const { key } = msg.payload as GetPayload;
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
                    const { value } = msg.payload as { key: string; value: unknown };
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
                    if (peer) peer.info.lastSeen = Date.now();
                    break;
               }
          }
     }

     private handleDisconnect(ws: WebSocket): void {
          for (const [id, peer] of this.peers) {
               if (peer.ws === ws) {
                    this.peers.delete(id);
                    this.ring.removeNode(id);
                    console.log(`[${this.nodeId}] Peer disconnected: ${id}`);
                    break;
               }
          }
     }

     private remoteGet<T>(nodeId: string, key: string): Promise<T | null> {
          return new Promise((resolve) => {
               const requestId = uuid().split('-').join('');
               const timeout = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    resolve(null);
               }, 3000);

               this.pendingRequests.set(requestId, (value) => {
                    clearTimeout(timeout);
                    resolve(value as T | null);
               });

               this.sendToPeer(nodeId, {
                    type: 'GET',
                    sender: this.nodeId,
                    requestId,
                    payload: { key } as GetPayload,
               });
          });
     }

     private sendToPeer(nodeId: string, msg: CacheMessage): void {
          const peer = this.peers.get(nodeId);
          if (peer?.ws.readyState === WebSocket.OPEN) {
               peer.ws.send(JSON.stringify(msg));
          }
     }

     private sendToPeerWs(ws: WebSocket, msg: CacheMessage): void {
          if (ws.readyState === WebSocket.OPEN) {
               ws.send(JSON.stringify(msg));
          }
     }

     private broadcast(msg: CacheMessage): void {
          for (const { ws } of this.peers.values()) {
               this.sendToPeerWs(ws, msg);
          }
     }

     private startHeartbeat(): void {
          const interval = this.options.heartbeatIntervalMs ?? 5000;
          this.heartbeatInterval = setInterval(() => {
               this.broadcast({
                    type: 'HEARTBEAT',
                    sender: this.nodeId,
                    payload: {},
               });
          }, interval);
     }

     getStats() {
          return {
               ...this.cache.getStats(),
               peers: [...this.peers.keys()],
               ringNodes: this.ring.getNodes('__probe__', 10),
          };
     }

     async shutdown(): Promise<void> {
          if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
          this.cache.destroy();
          this.wss.close();
     }
}
