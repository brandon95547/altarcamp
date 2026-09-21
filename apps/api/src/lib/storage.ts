import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { loadConfig } from '../config.js';

export interface StoredObject {
  storageKey: string;
  byteSize: number;
  sha256: string;
}

/**
 * Document storage behind an interface — spec §36 asks for private object storage.
 *
 * Phase 1 ships the local driver: files land on a Docker volume, never inside the web root,
 * and every read goes through an authorised API route. Swapping in S3/MinIO means adding a
 * driver here; nothing else in the app knows where bytes live.
 */
export interface StorageDriver {
  put(key: string, data: Buffer): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

class LocalStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  private resolveKey(key: string): string {
    // Keys are app-generated, but a traversal here would read arbitrary files, so verify.
    const target = resolve(this.root, normalize(key));
    const rootWithSep = resolve(this.root) + sep;
    if (!target.startsWith(rootWithSep)) {
      throw new Error(`Refusing storage key outside the storage root: ${key}`);
    }
    return target;
  }

  async put(key: string, data: Buffer): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data, { mode: 0o600 });
    return {
      storageKey: key,
      byteSize: data.byteLength,
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.resolveKey(key)).catch(() => undefined);
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (!driver) {
    const config = loadConfig();
    if (config.STORAGE_DRIVER === 's3') {
      throw new Error(
        'The S3 storage driver is not implemented in phase 1. Set STORAGE_DRIVER=local.',
      );
    }
    driver = new LocalStorageDriver(resolve(config.STORAGE_DIR));
  }
  return driver;
}

export function setStorage(custom: StorageDriver | null): void {
  driver = custom;
}

/** artists/<artistId>/<folder>/<timestamp>-<safe filename> */
export function buildStorageKey(artistId: string, folder: string, filename: string): string {
  const safe = filename.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  return join('artists', artistId, folder, `${Date.now()}-${safe}`);
}
