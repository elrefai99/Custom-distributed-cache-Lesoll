import { CacheEntry } from "../Common/interface";

export class LRUCache<T = unknown> {
     private readonly maxSize: number;
     private readonly map: Map<string, CacheEntry<T>>;

     constructor(maxSize = 1_000) {
          this.maxSize = maxSize;
          this.map = new Map();
     }

     get(key: string): CacheEntry<T> | undefined {
          if (!this.map.has(key)) return undefined;

          const entry = this.map.get(key)!;

          if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
               this.map.delete(key);
               return undefined;
          }

          this.map.delete(key);
          this.map.set(key, entry);

          return entry;
     }

     has(key: string): boolean {
          return this.get(key) !== undefined;
     }

     set(key: string, value: T, ttlMs: number | null = null): void {
          if (this.map.size >= this.maxSize && !this.map.has(key)) {
               const lruKey = this.map.keys().next().value as string;
               this.map.delete(lruKey);
          }
          this.map.delete(key);
          this.map.set(key, {
               value,
               expiresAt: ttlMs ? Date.now() + ttlMs : null,
               createdAt: Date.now(),
          });
     }

     delete(key: string): boolean {
          return this.map.delete(key);
     }

     flush(): void {
          this.map.clear();
     }

     keys(): string[] {
          return [...this.map.keys()];
     }

     size(): number {
          return this.map.size;
     }

     snapshot(): Record<string, CacheEntry<T>> {
          const now = Date.now();
          const out: Record<string, CacheEntry<T>> = {};
          for (const [k, v] of this.map) {
               if (v.expiresAt === null || now <= v.expiresAt) {
                    out[k] = v;
               }
          }
          return out;
     }

     purgeExpired(): number {
          const now = Date.now();
          let purged = 0;
          for (const [k, v] of this.map) {
               if (v.expiresAt !== null && now > v.expiresAt) {
                    this.map.delete(k);
                    purged++;
               }
          }
          return purged;
     }
}
