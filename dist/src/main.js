"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_node_1 = require("./core/cache-node");
__exportStar(require("./core/cache-node"), exports);
__exportStar(require("./core/local-cache"), exports);
__exportStar(require("./core/consistent-hash"), exports);
const isMainModule = require.main === module;
if (isMainModule || process.env.RUN_AS_SERVER === 'true') {
    const port = parseInt(process.env.PORT || '30000');
    const host = process.env.HOST || '127.0.0.1';
    const nodeId = process.env.NODE_ID;
    const replicationFactor = parseInt(process.env.REPLICATION_FACTOR || '2');
    const node = new cache_node_1.elrefaiNode({
        nodeId,
        host,
        port,
        replicationFactor
    });
    if (process.env.PEERS) {
        const peers = process.env.PEERS.split(',');
        peers.forEach(peerStr => {
            const [peerHost, peerPort] = peerStr.split(':');
            if (peerHost && peerPort) {
                console.log(`[${node.nodeId}] Attempting to connect to peer ${peerHost}:${peerPort}...`);
                node.connectToPeer(peerHost, parseInt(peerPort));
            }
        });
    }
    process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`\n[${node.nodeId}] Shutting down gracefully...`);
        yield node.shutdown();
        process.exit(0);
    }));
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBZ0Q7QUFFaEQsb0RBQWtDO0FBQ2xDLHFEQUFtQztBQUNuQyx5REFBdUM7QUFFdkMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7QUFFN0MsSUFBSSxZQUFZLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssTUFBTSxFQUFFLENBQUM7SUFDdEQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQztJQUM3QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztJQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTFFLE1BQU0sSUFBSSxHQUFHLElBQUksd0JBQVcsQ0FBQztRQUN4QixNQUFNO1FBQ04sSUFBSTtRQUNKLElBQUk7UUFDSixpQkFBaUI7S0FDckIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25CLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ25CLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCxJQUFJLFFBQVEsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLG1DQUFtQyxRQUFRLElBQUksUUFBUSxLQUFLLENBQUMsQ0FBQztnQkFDekYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEQsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztJQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQVMsRUFBRTtRQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sK0JBQStCLENBQUMsQ0FBQztRQUM5RCxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQ2hELE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMifQ==