import { createHash } from 'node:crypto';

export class ConsistentHashRing {
     private ring = new Map<number, string>();
     private sortedKeys: number[] = [];

     constructor(private readonly virtualNodes = 150) { }

     addNode(nodeId: string): void {
          for (let i = 0; i < this.virtualNodes; i++) {
               const hash = this.hash(`${nodeId}:vn${i}`);
               this.ring.set(hash, nodeId);
          }
          this.sortedKeys = [...this.ring.keys()].sort((a, b) => a - b);
     }

     removeNode(nodeId: string): void {
          for (let i = 0; i < this.virtualNodes; i++) {
               const hash = this.hash(`${nodeId}:vn${i}`);
               this.ring.delete(hash);
          }
          this.sortedKeys = [...this.ring.keys()].sort((a, b) => a - b);
     }

     getNodes(key: string, count = 1): string[] {
          if (this.ring.size === 0) return [];

          const keyHash = this.hash(key);
          const result: string[] = [];
          const seen = new Set<string>();

          let idx = this.binarySearch(keyHash);
          let attempts = 0;

          while (result.length < count && attempts < this.sortedKeys.length) {
               const ringKey = this.sortedKeys[idx % this.sortedKeys.length];
               const nodeId = this.ring.get(ringKey)!;

               if (!seen.has(nodeId)) {
                    seen.add(nodeId);
                    result.push(nodeId);
               }

               idx++;
               attempts++;
          }

          return result;
     }

     getNode(key: string): string | null {
          const nodes = this.getNodes(key, 1);
          return nodes[0] ?? null;
     }

     private hash(input: string): number {
          const h = createHash('md5').update(input).digest('hex');
          return parseInt(h.substring(0, 8), 16);
     }

     private binarySearch(target: number): number {
          let lo = 0, hi = this.sortedKeys.length - 1;
          while (lo <= hi) {
               const mid = Math.floor((lo + hi) / 2);
               if (this.sortedKeys[mid] < target) lo = mid + 1;
               else hi = mid - 1;
          }
          return lo % this.sortedKeys.length;
     }
}
