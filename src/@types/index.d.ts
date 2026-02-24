export interface CacheEntry<T = unknown> {
     value: T;
     expiresAt: number | null;
     createdAt: number;
     version: number;
}

export interface NodeInfo {
     id: string;
     host: string;
     port: number;
     status: 'alive' | 'suspected' | 'dead';
     lastSeen: number;
}

export interface CacheMessage {
     type:
     | 'SET'
     | 'DELETE'
     | 'GET'
     | 'GET_RESPONSE'
     | 'HEARTBEAT'
     | 'NODE_JOIN'
     | 'NODE_LEAVE'
     | 'SYNC_REQUEST'
     | 'SYNC_RESPONSE';
     sender: string;
     requestId?: string;
     payload: unknown;
}

export interface SetPayload {
     key: string;
     value: unknown;
     ttlMs?: number;
}

export interface GetPayload {
     key: string;
}

export interface CacheStats {
     hits: number;
     misses: number;
     size: number;
     nodeId: string;
}
