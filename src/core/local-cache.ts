import { EventEmitter } from 'events';
import { CacheEntry, CacheStats } from '../@types';

export class LocalCache extends EventEmitter {
     private store = new Map<string, CacheEntry>();
     private stats = { hits: 0, misses: 0 };
     private cleanupInterval: NodeJS.Timeout;

     constructor(private readonly nodeId: string, cleanupIntervalMs = 5000) {
          super();
          this.cleanupInterval = setInterval(() => this.evictExpired(), cleanupIntervalMs);
     }

     set<T>(key: string, value: T, ttlMs?: number): void {
          const existing = this.store.get(key);
          const entry: CacheEntry<T> = {
               value,
               expiresAt: ttlMs ? Date.now() + ttlMs : null,
               createdAt: Date.now(),
               version: existing ? existing.version + 1 : 1,
          };
          this.store.set(key, entry);
          this.emit('set', key, entry);
     }

     get<T>(key: string): T | null {
          const entry = this.store.get(key);

          if (!entry) {
               this.stats.misses++;
               return null;
          }

          if (entry.expiresAt && Date.now() > entry.expiresAt) {
               this.store.delete(key);
               this.stats.misses++;
               this.emit('expired', key);
               return null;
          }

          this.stats.hits++;
          return entry.value as T;
     }

     delete(key: string): boolean {
          const deleted = this.store.delete(key);
          if (deleted) this.emit('delete', key);
          return deleted;
     }

     has(key: string): boolean {
          return this.get(key) !== null;
     }

     getEntry(key: string): CacheEntry | undefined {
          return this.store.get(key);
     }

     setEntry(key: string, entry: CacheEntry): void {
          this.store.set(key, entry);
     }

     getAll(): Map<string, CacheEntry> {
          return new Map(this.store);
     }

     getStats(): CacheStats {
          return {
               ...this.stats,
               size: this.store.size,
               nodeId: this.nodeId,
          };
     }

     private evictExpired(): void {
          const now = Date.now();
          for (const [key, entry] of this.store) {
               if (entry.expiresAt && now > entry.expiresAt) {
                    this.store.delete(key);
                    this.emit('expired', key);
               }
          }
     }

     destroy(): void {
          clearInterval(this.cleanupInterval);
     }
}
