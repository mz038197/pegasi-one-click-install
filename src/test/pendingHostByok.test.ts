import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  finalizePendingHostByok,
  type PendingHostByok,
} from "../pendingHostByok";

describe("finalizePendingHostByok", () => {
  it("writes Host secret when pending and api key exist", async () => {
    let cleared = false;
    let ensured = false;
    const pending: PendingHostByok = {
      extensionId: "vans-coding.pegasi-classroom-install",
      userDir: "/tmp/Code/User",
    };
    const result = await finalizePendingHostByok({
      pending,
      getApiKey: async () => "vcr_sk_abc",
      clearPending: () => {
        cleared = true;
      },
      ensureHost: async () => {
        ensured = true;
        return { hostStorageKey: "secret://chat.lm.secret.-7a55c1a5" };
      },
    });
    assert.equal(result, "wrote");
    assert.equal(ensured, true);
    assert.equal(cleared, true);
  });

  it("skips when there is no pending marker", async () => {
    const result = await finalizePendingHostByok({
      pending: undefined,
      getApiKey: async () => "vcr_sk_abc",
      clearPending: () => undefined,
      ensureHost: async () => {
        throw new Error("no");
      },
    });
    assert.equal(result, "skipped");
  });
});
