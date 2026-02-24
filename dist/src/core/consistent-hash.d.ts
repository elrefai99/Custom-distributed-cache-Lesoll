export declare class ConsistentHashRing {
    private readonly virtualNodes;
    private ring;
    private sortedKeys;
    constructor(virtualNodes?: number);
    addNode(nodeId: string): void;
    removeNode(nodeId: string): void;
    getNodes(key: string, count?: number): string[];
    getNode(key: string): string | null;
    private hash;
    private binarySearch;
}
