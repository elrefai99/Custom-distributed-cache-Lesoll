import { request as nodeRequest, get as nodeGet, IncomingMessage } from "http";

const DEFAULT_TIMEOUT_MS = 3_000;

export function httpPost<T = unknown>(
     url: string,
     body: unknown,
     timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
     return new Promise((resolve, reject) => {
          const raw = JSON.stringify(body);
          const parsed = new URL(url);

          const req = nodeRequest(
               {
                    method: "POST",
                    hostname: parsed.hostname,
                    port: parsed.port,
                    path: parsed.pathname,
                    headers: {
                         "Content-Type": "application/json",
                         "Content-Length": Buffer.byteLength(raw),
                    },
               },
               (res: IncomingMessage) => {
                    let data = "";
                    res.on("data", (chunk: Buffer) => (data += chunk.toString()));
                    res.on("end", () => {
                         try { resolve(JSON.parse(data) as T); }
                         catch { resolve(data as unknown as T); }
                    });
               }
          );

          req.setTimeout(timeoutMs, () => {
               req.destroy();
               reject(new Error(`POST ${url} timed out after ${timeoutMs}ms`));
          });

          req.on("error", reject);
          req.write(raw);
          req.end();
     });
}

export function httpGet<T = unknown>(
     url: string,
     timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
     return new Promise((resolve, reject) => {
          const req = nodeGet(url, (res: IncomingMessage) => {
               let data = "";
               res.on("data", (chunk: Buffer) => (data += chunk.toString()));
               res.on("end", () => {
                    try { resolve(JSON.parse(data) as T); }
                    catch { resolve(data as unknown as T); }
               });
          });

          req.setTimeout(timeoutMs, () => {
               req.destroy();
               reject(new Error(`GET ${url} timed out after ${timeoutMs}ms`));
          });

          req.on("error", reject);
     });
}

export function readBody<T = unknown>(req: IncomingMessage): Promise<T> {
     return new Promise((resolve) => {
          let raw = "";
          req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
          req.on("end", () => {
               try { resolve(JSON.parse(raw) as T); }
               catch { resolve({} as T); }
          });
     });
}
