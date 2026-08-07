import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeByokFile } from "../writeByokFile";

describe("writeByokFile", () => {
  it("merges template, writes api key, and returns target path", async () => {
    const files = new Map<string, string>();
    const target = await writeByokFile({
      userDir: "/tmp/user",
      template: [
        {
          name: "VCRouter",
          vendor: "customendpoint",
          apiKey: "",
          models: [{ id: "m1", name: "m1", url: "http://203-71-78-31.nip.io:8000/v1" }],
        },
      ],
      apiKey: "${input:chat.lm.secret.-7a55c1a5}",
      readFile: async (p) => {
        const v = files.get(p);
        if (v === undefined) {
          const err = new Error("missing") as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        }
        return v;
      },
      writeFile: async (p, data) => {
        files.set(p, data);
      },
      mkdir: async () => undefined,
    });

    assert.match(target, /chatLanguageModels\.json$/);
    const written = JSON.parse(files.get(target) ?? "null");
    assert.equal(written[0].apiKey, "${input:chat.lm.secret.-7a55c1a5}");
    assert.equal(written[0].name, "Pegasi Router");
  });
});
