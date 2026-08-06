import type { ChatLanguageModelProvider } from "./byokSetup";

export type RedeemResult = {
  api_key: string;
  session: {
    invite_code?: string;
    class_name?: string;
    name?: string;
    expires_at?: string;
  };
};

export type RouterPortalClient = {
  fetchChatLanguageModelsTemplate: () => Promise<ChatLanguageModelProvider[]>;
  redeemWithHandoff: (
    handoffToken: string,
    inviteCode: string,
  ) => Promise<RedeemResult>;
  fetchCourseCatalogYaml: (apiKey: string) => Promise<string>;
};

export function createRouterPortalClient(baseUrl: string): RouterPortalClient {
  const root = baseUrl.replace(/\/+$/, "");

  return {
    async fetchChatLanguageModelsTemplate() {
      const res = await fetch(`${root}/extension/chat-language-models`);
      if (!res.ok) {
        throw new Error(`無法取得模型清單（HTTP ${res.status}）`);
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("模型清單格式錯誤");
      }
      return data as ChatLanguageModelProvider[];
    },

    async redeemWithHandoff(handoffToken, inviteCode) {
      const res = await fetch(`${root}/extension/sessions/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoff_token: handoffToken,
          invite_code: inviteCode,
        }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { detail?: string };
          if (body.detail) {
            detail = String(body.detail);
          }
        } catch {
          // keep status
        }
        throw new Error(detail);
      }
      return (await res.json()) as RedeemResult;
    },

    async fetchCourseCatalogYaml(apiKey) {
      const res = await fetch(`${root}/extension/course-catalog`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { detail?: string };
          if (body.detail) {
            detail = String(body.detail);
          }
        } catch {
          // keep status
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as { course_catalog_yaml?: unknown };
      if (typeof data.course_catalog_yaml !== "string") {
        throw new Error("Course Catalog 格式錯誤");
      }
      return data.course_catalog_yaml;
    },
  };
}

export function defaultRouterBaseUrl(
  getConfig: (key: string) => unknown = () => undefined,
): string {
  const configured = getConfig("pegasiClassroomInstall.routerBaseUrl");
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }
  return "http://203-71-78-31.nip.io:8000";
}
