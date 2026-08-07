import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearClassroomConnection } from "../clearClassroomConnection";
import { chatLanguageModelsPath } from "../editorUserPath";
import { CLASSROOM_CHAT_LM_SECRET_KEY } from "../hostLmSecret";

describe("clearClassroomConnection", () => {
  it("removes Pegasi Router after secrets; keeps other providers", async () => {
    const files = new Map<string, string>();
    const userDir = "/tmp/user";
    const modelsPath = chatLanguageModelsPath(userDir);
    files.set(
      modelsPath,
      JSON.stringify([
        { name: "OpenRouter", vendor: "openrouter", apiKey: "keep" },
        {
          name: "Pegasi Router",
          vendor: "customendpoint",
          apiKey: "${input:chat.lm.secret.-7a55c1a5}",
        },
      ]),
    );
    const deletedSecrets: string[] = [];
    let hostDeleteArgs:
      | { stateDbPath: string; secretKey?: string }
      | undefined;
    const steps: string[] = [];

    await clearClassroomConnection({
      userDir,
      stateDbPath: "/tmp/user/globalStorage/state.vscdb",
      deleteSecret: async (key) => {
        steps.push(`secret:${key}`);
        deletedSecrets.push(key);
      },
      deleteHostSecret: async (args) => {
        steps.push("host");
        hostDeleteArgs = args;
      },
      readFile: async (p) => {
        steps.push("read");
        const v = files.get(p);
        if (v === undefined) {
          const err = new Error("missing") as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        }
        return v;
      },
      writeFile: async (p, data) => {
        steps.push("write");
        files.set(p, data);
      },
    });

    assert.deepEqual(steps.slice(0, 3), [
      "host",
      "secret:classroomApiKey",
      `secret:${CLASSROOM_CHAT_LM_SECRET_KEY}`,
    ]);
    assert.ok(steps.indexOf("write") > steps.indexOf("host"));

    const written = JSON.parse(files.get(modelsPath) ?? "null");
    assert.equal(written.length, 1);
    assert.equal(written[0].name, "OpenRouter");
    assert.deepEqual(hostDeleteArgs, {
      stateDbPath: "/tmp/user/globalStorage/state.vscdb",
      secretKey: CLASSROOM_CHAT_LM_SECRET_KEY,
    });
    assert.deepEqual(deletedSecrets.sort(), [
      CLASSROOM_CHAT_LM_SECRET_KEY,
      "classroomApiKey",
    ].sort());
  });

  it("does not rewrite JSON when Host secret delete fails", async () => {
    const files = new Map<string, string>();
    const userDir = "/tmp/user";
    const modelsPath = chatLanguageModelsPath(userDir);
    const original = JSON.stringify([
      {
        name: "Pegasi Router",
        vendor: "customendpoint",
        apiKey: "${input:chat.lm.secret.-7a55c1a5}",
      },
    ]);
    files.set(modelsPath, original);

    await assert.rejects(
      () =>
        clearClassroomConnection({
          userDir,
          stateDbPath: "/tmp/user/globalStorage/state.vscdb",
          deleteSecret: async () => undefined,
          deleteHostSecret: async () => {
            throw new Error("database is locked");
          },
          readFile: async (p) => files.get(p)!,
          writeFile: async (p, data) => {
            files.set(p, data);
          },
        }),
      /database is locked/,
    );
    assert.equal(files.get(modelsPath), original);
  });

  it("leaves legacy VCRouter rows untouched", async () => {
    const files = new Map<string, string>();
    const userDir = "/tmp/user";
    const modelsPath = chatLanguageModelsPath(userDir);
    files.set(
      modelsPath,
      JSON.stringify([
        { name: "VCRouter", vendor: "customendpoint", apiKey: "old" },
        {
          name: "Pegasi Router",
          vendor: "customendpoint",
          apiKey: "${input:chat.lm.secret.-7a55c1a5}",
        },
      ]),
    );

    await clearClassroomConnection({
      userDir,
      stateDbPath: "/tmp/user/globalStorage/state.vscdb",
      deleteSecret: async () => undefined,
      deleteHostSecret: async () => undefined,
      readFile: async (p) => files.get(p)!,
      writeFile: async (p, data) => {
        files.set(p, data);
      },
    });

    const written = JSON.parse(files.get(modelsPath) ?? "null");
    assert.equal(written.length, 1);
    assert.equal(written[0].name, "VCRouter");
  });

  it("propagates deleteSecret failures", async () => {
    await assert.rejects(
      () =>
        clearClassroomConnection({
          userDir: "/tmp/user",
          stateDbPath: "/tmp/user/globalStorage/state.vscdb",
          deleteSecret: async () => {
            throw new Error("secret delete failed");
          },
          deleteHostSecret: async () => undefined,
          readFile: async () => {
            const err = new Error("missing") as NodeJS.ErrnoException;
            err.code = "ENOENT";
            throw err;
          },
        }),
      /secret delete failed/,
    );
  });
});
