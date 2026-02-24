# 🗄️ Custom Distributed Cache

A lightweight, fully TypeScript-native **distributed in-memory cache** built on top of WebSockets. Nodes communicate peer-to-peer, replicate data automatically, and recover state when new peers join — no external broker or infrastructure required.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Consistent Hashing** | Keys are distributed across nodes using a virtual-node consistent hash ring (MD5, 150 virtual nodes per peer) so that adding/removing a node only remaps a small fraction of keys |
| **Configurable Replication** | Each `set` call writes to *N* responsible nodes (configurable via `replicationFactor`) for fault tolerance |
| **Automatic Sync on Join** | When a new node joins the cluster, any existing peer sends it a full snapshot of its cache so state is never lost |
| **Last-Write-Wins Conflict Resolution** | Every cache entry carries a monotonically incrementing `version` number; on sync, the entry with the highest version wins |
| **TTL / Expiry** | Optional per-key TTL (in milliseconds) with a periodic background eviction sweep |
| **Remote GET Fallback** | If a key is not held locally, the node transparently proxies the request to the responsible peer and awaits the response (3 s timeout) |
| **Heartbeat** | Nodes broadcast a heartbeat every 5 s (configurable) so peers can track liveness |
| **Zero External Dependencies** | Communication is pure WebSocket (`ws`). No Redis, no Kafka, no etcd needed |
| **Full TypeScript** | Strict types end-to-end; ships clean `d.ts` declarations |

---

## 📐 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Your Application                       │
└───────────────────────────┬──────────────────────────────────┘
                            │  set / get / delete
              ┌─────────────▼─────────────┐
              │         elrefaiNode        │  ← public API
              │  ┌──────────────────────┐  │
              │  │  ConsistentHashRing  │  │  ← key → node(s) mapping
              │  └──────────────────────┘  │
              │  ┌──────────────────────┐  │
              │  │     LocalCache       │  │  ← in-process Map + TTL
              │  └──────────────────────┘  │
              │  ┌──────────────────────┐  │
              │  │  WebSocket Server    │  │  ← listens for peers
              │  └──────────────────────┘  │
              └─────────────┬─────────────┘
                            │  ws://
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
      Node :6001        Node :6002        Node :6003
```

### Message Protocol

All inter-node communication uses JSON messages over WebSocket:

| Message Type | Direction | Purpose |
|---|---|---|
| `NODE_JOIN` | peer → cluster | Announce presence + trigger sync |
| `SYNC_RESPONSE` | cluster → peer | Full cache snapshot sent to new joiner |
| `SET` | any → replicas | Replicate a write |
| `DELETE` | any → all | Propagate a deletion |
| `GET` / `GET_RESPONSE` | any ↔ responsible | Remote key lookup |
| `HEARTBEAT` | any → all | Liveness ping |

---

## 📦 Installation

> **Requires:** Node.js ≥ 18, pnpm ≥ 9

```bash
# clone the repo
git clone https://github.com/elrefai99/Custom-distributed-cache.git
cd Custom-distributed-cache

# install all workspace dependencies
pnpm install
```

---

## 🚀 Quick Start

### JavaScript (CommonJS / ESM)

```js
const { elrefaiNode } = require('custom-distributed-cache');

async function main() {
  // Spin up three nodes on different ports
  const node1 = new elrefaiNode({ host: '127.0.0.1', port: 6001, replicationFactor: 2 });
  const node2 = new elrefaiNode({ host: '127.0.0.1', port: 6002, replicationFactor: 2 });
  const node3 = new elrefaiNode({ host: '127.0.0.1', port: 6003, replicationFactor: 2 });

  // Let the servers bind before connecting peers
  await new Promise(r => setTimeout(r, 500));

  // Connect nodes into a cluster
  node2.connectToPeer('127.0.0.1', 6001);
  node3.connectToPeer('127.0.0.1', 6001);
  node3.connectToPeer('127.0.0.1', 6002);

  await new Promise(r => setTimeout(r, 500));

  // Write from node1 — automatically replicated to a second node
  await node1.set('user:123', { name: 'Alice', role: 'admin' }, 60_000);
  await node1.set('session:abc', 'token-xyz', 30_000);

  // Read from any node — transparent remote fetch if needed
  const user = await node2.get('user:123');
  console.log('Got from node2:', user); // { name: 'Alice', role: 'admin' }

  const session = await node3.get('session:abc');
  console.log('Got from node3:', session); // 'token-xyz'

  console.log('Node1 stats:', node1.getStats());

  // Graceful shutdown
  await Promise.all([node1.shutdown(), node2.shutdown(), node3.shutdown()]);
}

main().catch(console.error);
```

### TypeScript

```ts
import { elrefaiNode } from 'custom-distributed-cache';

const node = new elrefaiNode({ host: '127.0.0.1', port: 6001, replicationFactor: 2 });

await node.set<{ name: string }>('user:1', { name: 'Bob' }, 30_000);

const user = await node.get<{ name: string }>('user:1');
// user.name === 'Bob'
```

---

## 🔧 API Reference

### `new elrefaiNode(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | — | Host/IP for this node's WebSocket server |
| `port` | `number` | — | Port for this node's WebSocket server |
| `nodeId` | `string` | auto (UUID) | Unique identifier for this node |
| `replicationFactor` | `number` | `2` | Number of nodes each key is written to |
| `heartbeatIntervalMs` | `number` | `5000` | How often (ms) to broadcast a heartbeat |

### Methods

```ts
// Store a value. ttlMs is optional; omit for no expiry.
node.set(key: string, value: unknown, ttlMs?: number): Promise<void>

// Retrieve a value. Returns null on miss/expired. Falls back to remote peer.
node.get<T>(key: string): Promise<T | null>

// Delete a key locally and broadcast the deletion to all peers.
node.delete(key: string): Promise<void>

// Connect this node to a peer (triggers NODE_JOIN + SYNC_RESPONSE).
node.connectToPeer(host: string, port: number): void

// Returns hit/miss stats, current size, peers list, and ring layout.
node.getStats(): CacheStats & { peers: string[]; ringNodes: string[] }

// Stop heartbeat, clear local store, close WebSocket server.
node.shutdown(): Promise<void>
```

---

## 🏗️ Project Structure

```
Custom-distributed-cache/
├── src/
│   ├── core/
│   │   ├── cache-node.ts        # Main node class — orchestrates everything
│   │   ├── local-cache.ts       # In-memory Map store with TTL + EventEmitter
│   │   └── consistent-hash.ts   # Virtual-node consistent hash ring
│   ├── @types/
│   │   └── index.d.ts           # Shared TypeScript interfaces
│   └── main.ts                  # Package entry — re-exports public API
├── example/
│   ├── javascript/              # Plain JS usage example
│   └── typescript/              # TypeScript usage example
├── tsconfig.json                # Development TypeScript config
├── tsconfig.build.json          # Production build config
├── tsconfig.test.json           # Test config
└── pnpm-workspace.yaml          # pnpm monorepo workspace definition
```

---

## 🛠️ Development

```bash
# Run in watch mode (nodemon + ts-node)
pnpm dev

# Start once
pnpm start
```

---

## 🧠 How Consistent Hashing Works

The `ConsistentHashRing` uses **150 virtual nodes** per physical node to ensure even key distribution even with a small number of peers.

1. Each node ID is hashed 150 times (`nodeId:vn0` … `nodeId:vn149`) using MD5, and those hashes are placed on a logical ring.
2. To find the owner of a key, its MD5 hash is located on the ring via binary search, and we walk clockwise to find the first real node.
3. For replication, we continue walking clockwise and collect `replicationFactor` *distinct* nodes.
4. When a node is removed, its virtual slots are deleted; keys automatically remapped to the next node on the ring.

---

## 🔄 Data Sync on Node Join

When `connectToPeer()` is called:

1. The connecting node sends a `NODE_JOIN` message to the target peer.
2. The target peer responds with a `SYNC_RESPONSE` containing its entire cache snapshot.
3. The joining node merges the snapshot using **last-write-wins** (higher `version` number wins on conflict).

This ensures a newly added node immediately has access to existing cached data.

---

## 📊 Cache Stats Example

```ts
node1.getStats();
// {
//   nodeId: 'a3f2...',
//   hits: 42,
//   misses: 7,
//   size: 15,          // number of keys held locally
//   peers: ['b1c4...', 'e9d8...'],
//   ringNodes: [...]   // nodes responsible for a probe key
// }
```

---

## 📄 License

ISC © [Mohamed Elrefai](https://github.com/elrefai99)
