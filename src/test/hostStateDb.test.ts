import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { CLASSROOM_CHAT_LM_SECRET_KEY } from "../hostLmSecret";
import {
  ensureHostChatLmSecret,
  extensionSecretStorageKey,
  hostChatLmSecretStorageKey,
  hostStateDbPath,
  promoteExtensionSecretToHost,
  serializeSafeStorageBuffer,
  writeHostChatLmSecret,
} from "../hostStateDb";

function makeTempDb(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "host-state-db-"));
  const dbPath = path.join(dir, "state.vscdb");
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
  db.close();
  return dbPath;
}

describe("hostStateDb keys", () => {
  it("builds User/globalStorage/state.vscdb and Host vs extension secret keys", () => {
    assert.equal(
      hostStateDbPath("/tmp/Code/User"),
      path.join("/tmp/Code/User", "globalStorage", "state.vscdb"),
    );
    assert.equal(
      hostChatLmSecretStorageKey(),
      "secret://chat.lm.secret.-7a55c1a5",
    );
    assert.equal(
      extensionSecretStorageKey("vans-coding.pegasi-classroom-install", CLASSROOM_CHAT_LM_SECRET_KEY),
      'secret://{"extensionId":"vans-coding.pegasi-classroom-install","key":"chat.lm.secret.-7a55c1a5"}',
    );
  });
});

describe("promoteExtensionSecretToHost", () => {
  it("copies encrypted blob from extension-scoped key to Host key", async () => {
    const dbPath = makeTempDb();
    const blob = serializeSafeStorageBuffer(Buffer.from("v10fake"));
    const extKey = extensionSecretStorageKey(
      "vans-coding.pegasi-classroom-install",
      CLASSROOM_CHAT_LM_SECRET_KEY,
    );
    const db = new DatabaseSync(dbPath);
    db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(extKey, blob);
    db.close();

    const { hostStorageKey } = await promoteExtensionSecretToHost({
      stateDbPath: dbPath,
      extensionId: "vans-coding.pegasi-classroom-install",
    });

    const read = new DatabaseSync(dbPath);
    const row = read
      .prepare("SELECT value FROM ItemTable WHERE key = ?")
      .get(hostStorageKey) as { value: string };
    read.close();
    assert.equal(hostStorageKey, "secret://chat.lm.secret.-7a55c1a5");
    assert.equal(row.value, blob);
  });
});

describe("writeHostChatLmSecret", () => {
  it("encrypts via inject and upserts Host secret row", async () => {
    const dbPath = makeTempDb();
    await writeHostChatLmSecret({
      stateDbPath: dbPath,
      plaintext: "vcr_sk_test",
      encryptString: (v) => Buffer.from(`enc:${v}`),
    });
    const read = new DatabaseSync(dbPath);
    const row = read
      .prepare("SELECT value FROM ItemTable WHERE key = ?")
      .get("secret://chat.lm.secret.-7a55c1a5") as { value: string };
    read.close();
    assert.equal(row.value, serializeSafeStorageBuffer(Buffer.from("enc:vcr_sk_test")));
  });
});

describe("ensureHostChatLmSecret", () => {
  it("retries promote until the extension SecretStorage row appears", async () => {
    const dbPath = makeTempDb();
    const blob = serializeSafeStorageBuffer(Buffer.from("v10later"));
    const extKey = extensionSecretStorageKey(
      "vans-coding.pegasi-classroom-install",
      CLASSROOM_CHAT_LM_SECRET_KEY,
    );
    let attempts = 0;
    const { hostStorageKey } = await ensureHostChatLmSecret({
      stateDbPath: dbPath,
      extensionId: "vans-coding.pegasi-classroom-install",
      plaintext: "vcr_sk_unused",
      sleep: async () => undefined,
      maxAttempts: 5,
      promote: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("not flushed");
        }
        const db = new DatabaseSync(dbPath);
        db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(extKey, blob);
        db.close();
        return promoteExtensionSecretToHost({
          stateDbPath: dbPath,
          extensionId: "vans-coding.pegasi-classroom-install",
        });
      },
      writeDirect: async () => {
        throw new Error("should not encrypt");
      },
    });
    assert.equal(hostStorageKey, "secret://chat.lm.secret.-7a55c1a5");
    assert.equal(attempts, 3);
  });
});
