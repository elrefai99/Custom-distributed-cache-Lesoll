import { elrefaiNode } from './core/cache-node';

export * from './core/cache-node';
export * from './core/local-cache';
export * from './core/consistent-hash';

const isMainModule = require.main === module;

if (isMainModule || process.env.RUN_AS_SERVER === 'true') {
     const port = parseInt(process.env.PORT || '30000');
     const host = process.env.HOST || '127.0.0.1';
     const nodeId = process.env.NODE_ID;
     const replicationFactor = parseInt(process.env.REPLICATION_FACTOR || '2');

     const node = new elrefaiNode({
          nodeId,
          host,
          port,
          replicationFactor
     });

     if (process.env.PEERS) {
          const peers = process.env.PEERS.split(',');
          peers.forEach(peerStr => {
               const [peerHost, peerPort] = peerStr.split(':');
               if (peerHost && peerPort) {
                    console.log(`[${node.nodeId}] Attempting to connect to peer ${peerHost}:${peerPort}...`);
                    node.connectToPeer(peerHost, parseInt(peerPort));
               }
          });
     }

     process.on('SIGINT', async () => {
          console.log(`\n[${node.nodeId}] Shutting down gracefully...`);
          await node.shutdown();
          process.exit(0);
     });

     process.on('unhandledRejection', (reason, promise) => {
          console.error('Unhandled Rejection at:', promise, 'reason:', reason);
     });
}
