import { EventEmitter } from 'events';
import { CacheEntry, CacheStats } from '../@types';
export declare class LocalCache extends EventEmitter {
    private readonly nodeId;
    private store;
    private stats;
    private cleanupInterval;
    constructor(nodeId: string, cleanupIntervalMs?: number);
    set<T>(key: string, value: T, ttlMs?: number): void;
    get<T>(key: string): T | null;
    delete(key: string): boolean;
    has(key: string): boolean;
    getEntry(key: string): CacheEntry | undefined;
    setEntry(key: string, entry: CacheEntry): void;
    getAll(): Map<string, CacheEntry>;
    getStats(): CacheStats;
    private evictExpired;
    destroy(): void;
}
