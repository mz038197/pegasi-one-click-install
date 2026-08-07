import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASSROOM_CHAT_LM_SECRET_KEY,
  CLASSROOM_CHAT_PROVIDER_MATCH,
  applyHostSecretRefToProviders,
  brandClassroomChatProviderTemplate,
  isChatLmSecretInputRef,
  isPlainClassroomApiKey,
  isUnsupportedByokHost,
  removeMatchingProviders,
  toChatLmSecretInputRef,
} from "../hostLmSecret";

describe("toChatLmSecretInputRef", () => {
  it("wraps the Host secret key in ${input:…}", () => {
    assert.equal(
      toChatLmSecretInputRef(CLASSROOM_CHAT_LM_SECRET_KEY),
      "${input:chat.lm.secret.-7a55c1a5}",
    );
  });
});

describe("isChatLmSecretInputRef / isPlainClassroomApiKey", () => {
  it("detects Host secret refs vs plaintext Classroom API Key", () => {
    assert.equal(
      isChatLmSecretInputRef("${input:chat.lm.secret.-7a55c1a5}"),
      true,
    );
    assert.equal(isChatLmSecretInputRef("vcr_sk_abc"), false);
    assert.equal(isPlainClassroomApiKey("vcr_sk_abc"), true);
    assert.equal(
      isPlainClassroomApiKey("${input:chat.lm.secret.-7a55c1a5}"),
      false,
    );
  });
});

describe("applyHostSecretRefToProviders", () => {
  it("sets apiKey ref on matching vendor+name only", () => {
    const providers = applyHostSecretRefToProviders(
      [
        { name: "OpenRouter", vendor: "openrouter", apiKey: "keep" },
        {
          name: "Pegasi Router",
          vendor: "customendpoint",
          apiKey: "vcr_sk_old",
        },
      ],
      CLASSROOM_CHAT_PROVIDER_MATCH,
      "${input:chat.lm.secret.-7a55c1a5}",
    );
    assert.equal(providers[0]?.apiKey, "keep");
    assert.equal(
      providers[1]?.apiKey,
      "${input:chat.lm.secret.-7a55c1a5}",
    );
  });
});

describe("brandClassroomChatProviderTemplate", () => {
  it("rewrites template provider names to Pegasi Router", () => {
    const branded = brandClassroomChatProviderTemplate([
      { name: "VCRouter", vendor: "customendpoint", apiKey: "" },
    ]);
    assert.equal(branded[0]?.name, "Pegasi Router");
    assert.equal(branded[0]?.vendor, "customendpoint");
  });
});

describe("removeMatchingProviders / isUnsupportedByokHost", () => {
  it("drops only the matched provider", () => {
    const next = removeMatchingProviders(
      [
        { name: "OpenRouter", vendor: "openrouter" },
        { name: "Pegasi Router", vendor: "customendpoint" },
        { name: "VCRouter", vendor: "customendpoint" },
      ],
      CLASSROOM_CHAT_PROVIDER_MATCH,
    );
    assert.equal(next.length, 2);
    assert.equal(next[0]?.name, "OpenRouter");
    assert.equal(next[1]?.name, "VCRouter");
  });

  it("treats Cursor as unsupported BYOK host", () => {
    assert.equal(isUnsupportedByokHost("cursor"), true);
    assert.equal(isUnsupportedByokHost("vscode"), false);
  });
});
