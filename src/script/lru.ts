export class LRUCache {
     private maxSize: number;
     private map: Map<string, { value: any; expiresAt: number | null; createdAt: number }>;
     constructor(maxSize = 1000) {
          this.maxSize = maxSize;
          this.map = new Map();
     }

     public get(key: string) {
          if (!this.map.has(key)) return undefined;
          const entry: { value: any; expiresAt: number | null; createdAt: number } = this.map.get(key)!;

          if (entry.expiresAt && Date.now() > entry.expiresAt) {
               this.map.delete(key);
               return undefined;
          }

          this.map.delete(key);
          this.map.set(key, entry);
          return entry;
     }

     public set(key: string, value: any, ttlMs: number | null = null) {
          if (this.map.size >= this.maxSize && !this.map.has(key)) {
               const firstKey: string = this.map.keys().next().value!;
               this.map.delete(firstKey);
          }

          if (this.map.has(key)) this.map.delete(key);

          this.map.set(key, {
               value,
               expiresAt: ttlMs ? Date.now() + ttlMs : null,
               createdAt: Date.now(),
          });
     }

     public delete(key: string) {
          return this.map.delete(key);
     }

     public has(key: string) {
          const entry = this.get(key);
          return entry !== undefined;
     }

     public keys() {
          return [...this.map.keys()];
     }

     public size() {
          return this.map.size;
     }

     public snapshot() {
          const out: { [key: string]: { value: any; expiresAt: number | null; createdAt: number } } = {};
          for (const [k, v] of this.map) {
               if (!v.expiresAt || Date.now() <= v.expiresAt) {
                    out[k] = v;
               }
          }
          return out;
     }

     public purgeExpired() {
          const now = Date.now();
          let purged = 0;
          for (const [k, v] of this.map) {
               if (v.expiresAt && now > v.expiresAt) {
                    this.map.delete(k);
                    purged++;
               }
          }
          return purged;
     }
}
