import { promisify } from 'util';
import * as zlib from 'zlib';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Compress a JSON-serializable object and base64-encode the result.
 */
export async function compressObjectToBase64(obj: any): Promise<string> {
  const json = JSON.stringify(obj);
  const buf = Buffer.from(json, 'utf8');
  const compressed = await gzip(buf);
  return compressed.toString('base64');
}

/**
 * Decompress base64-encoded gzip data into JS object.
 */
export async function decompressBase64ToObject<T = any>(base64: string): Promise<T> {
  const buf = Buffer.from(base64, 'base64');
  const decompressed = await gunzip(buf);
  const json = decompressed.toString('utf8');
  return JSON.parse(json) as T;
}
