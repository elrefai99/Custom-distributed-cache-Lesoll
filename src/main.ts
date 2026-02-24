import { CacheNode } from './core/cache-node';

async function main() {
     const node1 = new CacheNode({ host: '127.0.0.1', port: 6001, replicationFactor: 2 });
     const node2 = new CacheNode({ host: '127.0.0.1', port: 6002, replicationFactor: 2 });
     const node3 = new CacheNode({ host: '127.0.0.1', port: 6003, replicationFactor: 2 });

     await new Promise(r => setTimeout(r, 500));

     node2.connectToPeer('127.0.0.1', 6001);
     node3.connectToPeer('127.0.0.1', 6001);
     node3.connectToPeer('127.0.0.1', 6002);

     await new Promise(r => setTimeout(r, 500));

     await node1.set('user:123', { name: 'Alice', role: 'admin' }, 60_000);
     await node1.set('session:abc', 'token-xyz', 30_000);

     const user = await node2.get<{ name: string }>('user:123');
     console.log('Got from node2:', user);

     const session = await node3.get<string>('session:abc');
     console.log('Got from node3:', session);

     console.log('Node1 stats:', node1.getStats());

     setTimeout(async () => {
          await Promise.all([node1.shutdown(), node2.shutdown(), node3.shutdown()]);
     }, 5000);
}

main().catch(console.error);
