import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLASSROOM_CHAT_LM_SECRET_KEY } from "../hostLmSecret";
import { RouterLaneService } from "../routerLaneService";
import type { RouterPortalClient } from "../routerPortalClient";

const sampleToken =
  "n1:1:1700000000:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

function baseOptions(overrides: Record<string, unknown> = {}) {
  const secrets = new Map<string, string>();
  return {
    secrets,
    options: {
      baseUrl: "http://203-71-78-31.nip.io:8000",
      openExternal: async () => true,
      resolveUserDir: () => "/tmp/Code/User",
      uriScheme: "vscode",
      extensionId: "vans-coding.pegasi-classroom-install",
      secretStore: {
        get: async (k: string) => secrets.get(k),
        store: async (k: string, v: string) => {
          secrets.set(k, v);
        },
        delete: async (k: string) => {
          secrets.delete(k);
        },
      },
      ...overrides,
    },
  };
}

describe("RouterLaneService", () => {
  it("redeems with Host secret ref, writes Host secret, and asks for reload", async () => {
    let wroteKey = "";
    let hostPlaintext = "";
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [
        { name: "VCRouter", vendor: "customendpoint", apiKey: "", models: [] },
      ],
      redeemWithHandoff: async (token, invite) => {
        assert.equal(token, sampleToken);
        assert.equal(invite, "ABC12345");
        return {
          api_key: "vcr_sk_testkey",
          session: {
            invite_code: invite,
            class_name: "Demo",
            name: "Week 1",
            expires_at: "2099-01-01T00:00:00Z",
          },
        };
      },
    };

    const { secrets, options } = baseOptions({
      writeByok: async ({ apiKey }: { apiKey: string }) => {
        wroteKey = apiKey;
        return "/tmp/Code/User/chatLanguageModels.json";
      },
      writeHostSecret: async ({
        plaintext,
      }: {
        plaintext: string;
        extensionId: string;
      }) => {
        hostPlaintext = plaintext;
        return { hostStorageKey: "secret://chat.lm.secret.-7a55c1a5" };
      },
    });

    const lane = new RouterLaneService(client, options);
    lane.setInviteCode("ABC12345");
    const result = await lane.acceptHandoffInput(sampleToken);

    assert.equal(lane.getView().status, "ready");
    assert.equal(wroteKey, `\${input:${CLASSROOM_CHAT_LM_SECRET_KEY}}`);
    assert.equal(secrets.get("classroomApiKey"), "vcr_sk_testkey");
    assert.equal(secrets.get(CLASSROOM_CHAT_LM_SECRET_KEY), "vcr_sk_testkey");
    assert.equal(hostPlaintext, "vcr_sk_testkey");
    assert.equal(result.needsReload, true);
    assert.equal(lane.getView().canClear, true);
    assert.match(lane.getView().detail, /BYOK/);
    assert.match(lane.getView().detail, /選課堂已設定的模型（清單裡的 VCRouter）/);
    assert.doesNotMatch(lane.getView().detail, /Pegasi Router/);
  });

  it("blocks Cursor host without redeeming", async () => {
    let redeemed = false;
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        redeemed = true;
        throw new Error("should not redeem");
      },
    };
    const { options } = baseOptions({ uriScheme: "cursor" });
    const lane = new RouterLaneService(client, options);
    assert.equal(lane.getView().canOpenSignIn, false);
    assert.equal(lane.getView().canRedeem, false);
    await lane.redeemAndSetup();
    assert.equal(redeemed, false);
    assert.match(lane.getView().detail, /Cursor/);
  });

  it("restores ready detail without exposing Classroom API Key prefix", async () => {
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("unused");
      },
    };
    const { secrets, options } = baseOptions();
    secrets.set("classroomApiKey", "vcr_sk_7053fdeadbeef");
    const lane = new RouterLaneService(client, options);
    await lane.restoreFromSecrets();
    assert.equal(lane.getView().status, "ready");
    assert.equal(lane.getView().detail, "Classroom API Key 已設定。");
    assert.doesNotMatch(lane.getView().detail, /vcr_sk_/);
  });

  it("prompts for 連線登入 when redeeming without handoff", async () => {
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("should not redeem");
      },
    };
    const { options } = baseOptions();
    const lane = new RouterLaneService(client, options);
    lane.setInviteCode("CODE");
    await lane.redeemAndSetup();
    assert.equal(lane.getView().status, "awaiting_sign_in");
    assert.match(lane.getView().detail, /連線登入/);
    assert.doesNotMatch(lane.getView().detail, /登入 Google/);
  });

  it("does not allow 連線登入 without Invite Code", async () => {
    let opened = false;
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("unused");
      },
    };
    const { options } = baseOptions({
      openExternal: async () => {
        opened = true;
        return true;
      },
    });
    const lane = new RouterLaneService(client, options);
    assert.equal(lane.getView().canOpenSignIn, false);
    assert.equal(lane.getView().showPasteUi, false);
    await lane.openGoogleSignIn();
    assert.equal(opened, false);
    assert.equal(lane.getView().status, "idle");
    assert.match(lane.getView().detail, /邀請碼/);
  });

  it("enables 連線登入 only after Invite Code and hides paste UI until awaiting", async () => {
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("unused");
      },
    };
    const { options } = baseOptions();
    const lane = new RouterLaneService(client, options);
    lane.setInviteCode("ABC12345");
    assert.equal(lane.getView().canOpenSignIn, true);
    assert.equal(lane.getView().showPasteUi, false);
    assert.equal(lane.getView().canRedeem, false);

    await lane.openGoogleSignIn();
    assert.equal(lane.getView().status, "awaiting_sign_in");
    assert.equal(lane.getView().showPasteUi, true);
    assert.equal(lane.getView().canRedeem, true);
    assert.equal(lane.getView().canOpenSignIn, true);
  });

  it("clears pending handoff when 重新連線登入", async () => {
    let openCount = 0;
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("should not redeem without fresh handoff path in this test");
      },
    };
    const { options } = baseOptions({
      openExternal: async () => {
        openCount += 1;
        return true;
      },
    });
    const lane = new RouterLaneService(client, options);
    lane.setInviteCode("CODE");
    // Simulate handoff arrived without invite first… then invite present but we re-open.
    // With invite present, acceptHandoff would redeem — so clear invite briefly:
    lane.setInviteCode("");
    await lane.acceptHandoffInput(sampleToken);
    assert.equal(lane.getView().status, "awaiting_sign_in");
    lane.setInviteCode("CODE");
    await lane.openGoogleSignIn();
    assert.equal(openCount, 1);
    // Old handoff must be gone: redeem without new paste should ask for sign-in handoff.
    await lane.redeemAndSetup();
    assert.equal(lane.getView().status, "awaiting_sign_in");
    assert.match(lane.getView().detail, /連線登入|貼碼|Sign-in Handoff/);
  });

  it("clears classroom connection and resets to idle", async () => {
    let cleared = false;
    const client: RouterPortalClient = {
      fetchCourseCatalogYaml: async () => "actions: []\n",
      fetchChatLanguageModelsTemplate: async () => [],
      redeemWithHandoff: async () => {
        throw new Error("unused");
      },
    };
    const { secrets, options } = baseOptions({
      clearByok: async () => {
        cleared = true;
        secrets.delete("classroomApiKey");
        return { modelsPath: "/tmp/Code/User/chatLanguageModels.json" };
      },
    });
    secrets.set("classroomApiKey", "vcr_sk_x");
    const lane = new RouterLaneService(client, options);
    await lane.restoreFromSecrets();
    assert.equal(lane.getView().status, "ready");
    assert.equal(lane.getView().canClear, true);

    const result = await lane.clearClassroomConnection();
    assert.equal(cleared, true);
    assert.equal(lane.getView().status, "idle");
    assert.equal(lane.getView().canClear, false);
    assert.equal(result.needsReload, true);
  });

});
