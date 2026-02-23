export interface CacheEntry<T = unknown> {
     value: T;
     expiresAt: number | null;
     createdAt: number;
}

export type ReplicationOp = "SET" | "DELETE";

export interface SyncPayload {
     op: ReplicationOp;
     key: string;
     value?: unknown;
     ttlMs?: number | null;
}

export interface SetRequestBody {
     key: string;
     value: unknown;
     ttl?: number;
}

export interface ApiResponse<T = unknown> {
     ok?: boolean;
     error?: string;
     key?: string;
     value?: T;
     keys?: string[];
     status?: string;
     nodeId?: string;
}

export interface CacheOptions {
     port?: number;
     nodeId?: string;
     peers?: string[];
     maxSize?: number;
     defaultTTL?: number;
     syncInterval?: number;
     purgeInterval?: number;
     replicationFactor?: "all" | number;
}

export interface CacheStats {
     nodeId: string;
     port: number;
     peers: string[];
     size: number;
     maxSize: number;
     hits: number;
     misses: number;
     sets: number;
     deletes: number;
     replications: number;
     hitRate: string;
}

export interface CacheEvents {
     hit: [key: string, value: unknown];
     miss: [key: string];
     set: [key: string, value: unknown];
     delete: [key: string];
     sync: [op: ReplicationOp, key: string];
     purge: [count: number];
     flush: [];
     "peer:error": [peer: string, error: Error];
     "peer:down": [peer: string];
}

export interface TypedEventEmitter<Events extends Record<string, unknown[]>> {
     on<E extends keyof Events>(event: E, listener: (...args: Events[E]) => void): this;
     emit<E extends keyof Events>(event: E, ...args: Events[E]): boolean;
     off<E extends keyof Events>(event: E, listener: (...args: Events[E]) => void): this;
     once<E extends keyof Events>(event: E, listener: (...args: Events[E]) => void): this;
}
