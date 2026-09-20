/**
 * Enable Node.js fetch proxy for Gemini and other external APIs.
 * Set HTTPS_PROXY in .env (e.g. http://127.0.0.1:7897).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

// __dirname = backend/src/utils → backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxyUrl) {
  const dispatcher = new ProxyAgent(proxyUrl);
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...(init as object),
      dispatcher,
    } as Parameters<typeof undiciFetch>[1])) as typeof fetch;
  console.log(`[setupProxy] 已启用代理: ${proxyUrl}`);
}
