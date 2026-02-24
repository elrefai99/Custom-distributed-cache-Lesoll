export interface CacheNodeOptions {
    nodeId?: string;
    host: string;
    port: number;
    replicationFactor?: number;
    heartbeatIntervalMs?: number;
}
export declare class elrefaiNode {
    private readonly options;
    readonly nodeId: string;
    private cache;
    private ring;
    private peers;
    private wss;
    private pendingRequests;
    private heartbeatInterval;
    constructor(options: CacheNodeOptions);
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    delete(key: string): Promise<void>;
    connectToPeer(host: string, port: number): void;
    private handleConnection;
    private handleMessage;
    private handleDisconnect;
    private remoteGet;
    private sendToPeer;
    private sendToPeerWs;
    private broadcast;
    private startHeartbeat;
    getStats(): {
        peers: string[];
        ringNodes: string[];
        hits: number;
        misses: number;
        size: number;
        nodeId: string;
    };
    shutdown(): Promise<void>;
}
