import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyApiKeyToTemplate, mergeByokConfig } from "../byokSetup";

describe("mergeByokConfig", () => {
  it("merges template providers and writes api key onto matching vendor/name", () => {
    const existing = [
      {
        name: "Other",
        vendor: "customendpoint",
        apiKey: "keep-me",
        models: [{ id: "x", name: "x", url: "https://example.com/v1" }],
      },
    ];
    const template = [
      {
        name: "VCRouter",
        vendor: "customendpoint",
        apiKey: "",
        apiType: "responses",
        models: [
          {
            id: "ollama_cloud@demo:cloud",
            name: "demo",
            url: "http://203-71-78-31.nip.io:8000/v1",
          },
        ],
      },
    ];

    const merged = mergeByokConfig(existing, template, "vcr_sk_test");
    assert.equal(merged.length, 2);
    const vans = merged.find((p) => p.name === "VCRouter");
    assert.ok(vans);
    assert.equal(vans.apiKey, "vcr_sk_test");
    assert.equal(merged[0]?.apiKey, "keep-me");
  });

  it("updates api key when VCRouter already exists", () => {
    const existing = [
      {
        name: "VCRouter",
        vendor: "customendpoint",
        apiKey: "old",
        models: [{ id: "ollama_cloud@demo:cloud", name: "demo", url: "http://203-71-78-31.nip.io:8000/v1" }],
      },
    ];
    const template = [
      {
        name: "VCRouter",
        vendor: "customendpoint",
        apiKey: "",
        models: [
          {
            id: "ollama_cloud@demo:cloud",
            name: "demo",
            url: "http://203-71-78-31.nip.io:8000/v1",
            toolCalling: true,
          },
        ],
      },
    ];
    const merged = mergeByokConfig(existing, template, "vcr_sk_new");
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.apiKey, "vcr_sk_new");
    const model = (merged[0]?.models as Array<Record<string, unknown>>)[0];
    assert.equal(model?.toolCalling, true);
  });
});

describe("applyApiKeyToTemplate", () => {
  it("sets apiKey on every top-level provider from template family", () => {
    const providers = applyApiKeyToTemplate(
      [{ name: "VCRouter", vendor: "customendpoint", apiKey: "" }],
      "vcr_sk_x",
    );
    assert.equal(providers[0]?.apiKey, "vcr_sk_x");
  });
});
