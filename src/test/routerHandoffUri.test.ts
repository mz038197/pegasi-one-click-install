import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHandoffToken } from "../routerHandoffUri";

describe("parseHandoffToken", () => {
  it("reads token from vscode handoff URI", () => {
    const token =
      "n1:42:1700000000:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const uri = `vscode://vans-coding.pegasi-classroom-install/handoff?token=${encodeURIComponent(token)}`;
    assert.equal(parseHandoffToken(uri), token);
  });

  it("accepts a bare paste-code token", () => {
    const token =
      "n1:42:1700000000:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    assert.equal(parseHandoffToken(token), token);
  });

  it("rejects empty or garbage input", () => {
    assert.equal(parseHandoffToken(""), undefined);
    assert.equal(parseHandoffToken("not-a-token"), undefined);
    assert.equal(parseHandoffToken("vscode://other/path"), undefined);
  });
});
