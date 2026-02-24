import { elrefaiNode } from './core/cache-node';

async function main() {
     const node1: elrefaiNode = new elrefaiNode({ host: '127.0.0.1', port: 30000, replicationFactor: 2 });
     await new Promise(r => setTimeout(r, 500));

     node1.connectToPeer('127.0.0.1', 30000);

     await new Promise(r => setTimeout(r, 500));

     await node1.set('user:123', { name: 'Alice', role: 'admin' }, 60);
     await node1.set('session:abc', 'token-xyz', 30000);

     const user = await node1.get<{ name: string }>('user:123');
     console.log('Got from node2:', user);

     const session = await node1.get<string>('session:abc');
     console.log('Got from node3:', session);

     console.log('Node1 stats:', node1.getStats());

     setTimeout(async () => {
          await Promise.all([node1.shutdown()]);
     }, 5000);
}

main().catch(console.error);
