import path from "node:path";
import {
  CLASSROOM_CHAT_LM_SECRET_KEY,
} from "./hostLmSecret";

/** Busy wait budget when Host also holds state.vscdb. */
export const HOST_STATE_DB_BUSY_TIMEOUT_MS = 3000;

/** True when SQLite reports the Host DB is contended. */
export function isHostStateDbBusyError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    message.includes("database is locked") ||
    message.includes("database is busy") ||
    message.includes("sqlite_busy")
  );
}

/** Path to Host globalStorage/state.vscdb from the editor User dir. */
export function hostStateDbPath(userDir: string): string {
  return path.join(userDir, "globalStorage", "state.vscdb");
}

/** Workbench (Copilot) secret row — no extensionId wrapper. */
export function hostChatLmSecretStorageKey(
  secretKey: string = CLASSROOM_CHAT_LM_SECRET_KEY,
): string {
  return `secret://${secretKey}`;
}

/** Extension-scoped SecretStorage row shape in state.vscdb. */
export function extensionSecretStorageKey(
  extensionId: string,
  secretKey: string,
): string {
  return `secret://${JSON.stringify({ extensionId, key: secretKey })}`;
}

export function serializeSafeStorageBuffer(encrypted: Uint8Array): string {
  return JSON.stringify({
    type: "Buffer",
    data: Array.from(encrypted),
  });
}

type SqliteDatabase = {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => { value?: string } | undefined;
  };
  close: () => void;
};

async function openStateDb(dbPath: string): Promise<SqliteDatabase> {
  try {
    const sqlite = await import("node:sqlite");
    // Experimental in Node; present on current VS Code / system Node used for tests.
    const DatabaseSync = (
      sqlite as unknown as {
        DatabaseSync: new (
          path: string,
          options?: { timeout?: number },
        ) => SqliteDatabase;
      }
    ).DatabaseSync;
    return new DatabaseSync(dbPath, { timeout: HOST_STATE_DB_BUSY_TIMEOUT_MS });
  } catch (err) {
    if (isHostStateDbBusyError(err)) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `無法開啟 Host state.vscdb（需要 node:sqlite）：${message}`,
    );
  }
}

export async function upsertItemTableValue(
  dbPath: string,
  key: string,
  value: string,
): Promise<void> {
  const db = await openStateDb(dbPath);
  try {
    db.prepare(
      "INSERT INTO ItemTable (key, value) VALUES (?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(key, value);
  } finally {
    db.close();
  }
}

export async function deleteItemTableKey(
  dbPath: string,
  key: string,
): Promise<void> {
  const db = await openStateDb(dbPath);
  try {
    db.prepare("DELETE FROM ItemTable WHERE key = ?").run(key);
  } finally {
    db.close();
  }
}

export async function deleteHostChatLmSecret(options: {
  stateDbPath: string;
  secretKey?: string;
}): Promise<void> {
  const secretKey = options.secretKey ?? CLASSROOM_CHAT_LM_SECRET_KEY;
  await deleteItemTableKey(
    options.stateDbPath,
    hostChatLmSecretStorageKey(secretKey),
  );
}

/**
 * Copy an already-encrypted SecretStorage blob to the Host chat.lm.secret.* key
 * that Copilot resolves for ${input:chat.lm.secret.…}.
 */
export async function promoteExtensionSecretToHost(options: {
  stateDbPath: string;
  extensionId: string;
  secretKey?: string;
}): Promise<{ hostStorageKey: string }> {
  const secretKey = options.secretKey ?? CLASSROOM_CHAT_LM_SECRET_KEY;
  const fromKey = extensionSecretStorageKey(options.extensionId, secretKey);
  const toKey = hostChatLmSecretStorageKey(secretKey);
  const db = await openStateDb(options.stateDbPath);
  try {
    const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(fromKey) as
      | { value?: string }
      | undefined;
    if (!row?.value) {
      throw new Error(
        `找不到擴充 SecretStorage 列（${fromKey}）。請先寫入 Classroom API Key。`,
      );
    }
    db.prepare(
      "INSERT INTO ItemTable (key, value) VALUES (?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(toKey, row.value);
  } finally {
    db.close();
  }
  return { hostStorageKey: toKey };
}

/** Encrypt via the Host Electron process (same cipher as Copilot SecretStorage). */
export function encryptWithElectronSafeStorage(plaintext: string): Uint8Array {
  // Extension host shares Electron; require keeps this off the VS Code public API surface.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electron = require("electron") as {
    safeStorage?: {
      isEncryptionAvailable?: () => boolean;
      encryptString?: (value: string) => Buffer;
    };
  };
  const safeStorage = electron.safeStorage;
  if (
    !safeStorage?.isEncryptionAvailable?.() ||
    typeof safeStorage.encryptString !== "function"
  ) {
    throw new Error("Host safeStorage 不可用，無法寫入 Classroom API Key");
  }
  return safeStorage.encryptString(plaintext);
}

/** Encrypt plaintext with Electron safeStorage and write Host chat.lm.secret.* row. */
export async function writeHostChatLmSecret(options: {
  stateDbPath: string;
  plaintext: string;
  secretKey?: string;
  encryptString?: (value: string) => Uint8Array;
}): Promise<{ hostStorageKey: string }> {
  const secretKey = options.secretKey ?? CLASSROOM_CHAT_LM_SECRET_KEY;
  const hostStorageKey = hostChatLmSecretStorageKey(secretKey);
  const encrypt = options.encryptString ?? encryptWithElectronSafeStorage;
  const encrypted = encrypt(options.plaintext);
  const value = serializeSafeStorageBuffer(encrypted);
  await upsertItemTableValue(options.stateDbPath, hostStorageKey, value);
  return { hostStorageKey };
}

/**
 * After extension SecretStorage.store, wait for the row to flush into state.vscdb
 * then copy it to the Host chat.lm.secret.* key. Falls back to Electron safeStorage
 * encrypt only if promote never sees the extension row (safeStorage is often missing
 * in the extension host).
 */
export async function ensureHostChatLmSecret(options: {
  stateDbPath: string;
  extensionId: string;
  plaintext: string;
  secretKey?: string;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  encryptString?: (value: string) => Uint8Array;
  promote?: typeof promoteExtensionSecretToHost;
  writeDirect?: typeof writeHostChatLmSecret;
}): Promise<{ hostStorageKey: string }> {
  const sleep =
    options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = options.maxAttempts ?? 25;
  const promote = options.promote ?? promoteExtensionSecretToHost;
  const writeDirect = options.writeDirect ?? writeHostChatLmSecret;

  let lastPromoteError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await promote({
        stateDbPath: options.stateDbPath,
        extensionId: options.extensionId,
        secretKey: options.secretKey,
      });
    } catch (err) {
      lastPromoteError = err;
      await sleep(40 + attempt * 20);
    }
  }

  try {
    return await writeDirect({
      stateDbPath: options.stateDbPath,
      plaintext: options.plaintext,
      secretKey: options.secretKey,
      encryptString: options.encryptString,
    });
  } catch (encryptErr) {
    const promoteMsg =
      lastPromoteError instanceof Error
        ? lastPromoteError.message
        : String(lastPromoteError);
    const encryptMsg =
      encryptErr instanceof Error ? encryptErr.message : String(encryptErr);
    throw new Error(
      `無法寫入 Host Classroom API Key（等待 SecretStorage 寫入失敗：${promoteMsg}；safeStorage：${encryptMsg}）`,
    );
  }
}
