import { EventEmitter } from "node:events";
import type { ChatLanguageModelProvider } from "./byokSetup";
import { clearClassroomConnection } from "./clearClassroomConnection";
import {
  CLASSROOM_CHAT_LM_SECRET_KEY,
  isUnsupportedByokHost,
  toChatLmSecretInputRef,
} from "./hostLmSecret";
import { isPlainClassroomApiKey } from "./hostLmSecret";
import {
  ensureHostChatLmSecret,
  hostStateDbPath,
  isHostStateDbBusyError,
} from "./hostStateDb";
import type { RouterPortalClient } from "./routerPortalClient";
import { parseHandoffToken } from "./routerHandoffUri";
import {
  clearClassroomConnectionBusyMessage,
  selectClassroomChatProviderHint,
} from "./studentCopy";
import { writeByokFile } from "./writeByokFile";

export type RouterLaneStatus =
  | "idle"
  | "awaiting_sign_in"
  | "busy"
  | "ready"
  | "error";

export type RouterLaneView = {
  status: RouterLaneStatus;
  inviteCode: string;
  detail: string;
  classLabel?: string;
  expiresAt?: string;
  /** Paste-code fallback +「貼上並完成連線」：僅等待／失敗支線可見。 */
  showPasteUi: boolean;
  canRedeem: boolean;
  canOpenSignIn: boolean;
  canClear: boolean;
};

export type RouterLaneActionResult = {
  needsReload: boolean;
  /** Host Full Restart CTA without treating the action as success. */
  offerRestart?: boolean;
};

type OpenExternal = (url: string) => Thenable<boolean>;

const CURSOR_BLOCK_DETAIL =
  "Cursor 不支援自動 BYOK。請改用 VS Code 完成課堂連線，或至 Portal 手動設定模型與 API Key。";

export class RouterLaneService {
  private readonly emitter = new EventEmitter();
  private inviteCode = "";
  private pendingHandoff: string | undefined;
  private status: RouterLaneStatus = "idle";
  private detail = "輸入邀請碼後按「連線登入」，即可兌換並完成 BYOK 設定。";
  private classLabel?: string;
  private expiresAt?: string;
  private readonly unsupportedHost: boolean;

  constructor(
    private readonly client: RouterPortalClient,
    private readonly options: {
      baseUrl: string;
      openExternal: OpenExternal;
      resolveUserDir: () => string;
      uriScheme: string;
      extensionId: string;
      secretStore: {
        get: (key: string) => Thenable<string | undefined>;
        store: (key: string, value: string) => Thenable<void>;
        delete: (key: string) => Thenable<void>;
      };
      apiKeySecretKey?: string;
      writeByok?: (args: {
        userDir: string;
        template: ChatLanguageModelProvider[];
        apiKey: string;
      }) => Promise<string>;
      /** Ensure Host chat.lm.secret.* row exists (promote-with-retry / encrypt fallback). */
      writeHostSecret?: (args: {
        stateDbPath: string;
        plaintext: string;
        extensionId: string;
      }) => Promise<{ hostStorageKey: string }>;
      clearByok?: typeof clearClassroomConnection;
    },
  ) {
    this.unsupportedHost = isUnsupportedByokHost(options.uriScheme);
    if (this.unsupportedHost) {
      this.status = "error";
      this.detail = CURSOR_BLOCK_DETAIL;
    }
  }

  onDidChange(listener: () => void): { dispose: () => void } {
    this.emitter.on("change", listener);
    return { dispose: () => this.emitter.off("change", listener) };
  }

  getView(): RouterLaneView {
    const busy = this.status === "busy";
    const blocked = this.unsupportedHost;
    const hasInvite = !!this.inviteCode.trim();
    const showPasteUi =
      !blocked &&
      (this.status === "awaiting_sign_in" || this.status === "error");
    return {
      status: this.status,
      inviteCode: this.inviteCode,
      detail: this.detail,
      ...(this.classLabel ? { classLabel: this.classLabel } : {}),
      ...(this.expiresAt ? { expiresAt: this.expiresAt } : {}),
      showPasteUi,
      canRedeem: showPasteUi && !busy && hasInvite,
      canOpenSignIn: !busy && !blocked && hasInvite,
      canClear: !busy && !blocked && this.status === "ready",
    };
  }

  setInviteCode(code: string): void {
    if (this.unsupportedHost) {
      return;
    }
    this.inviteCode = code;
    this.emit();
  }

  async openGoogleSignIn(): Promise<RouterLaneActionResult> {
    if (this.blockIfUnsupported()) {
      return { needsReload: false };
    }
    if (!this.inviteCode.trim()) {
      this.status = "idle";
      this.detail = "請先輸入邀請碼，再按「連線登入」。";
      this.emit();
      return { needsReload: false };
    }
    // R1：重新連線登入時丟掉舊手遞，避免過期 token 被誤用。
    this.pendingHandoff = undefined;
    const url = `${this.options.baseUrl.replace(/\/+$/, "")}/auth/google/login?client=extension`;
    this.status = "awaiting_sign_in";
    this.detail =
      "已開啟瀏覽器，請完成 Google 登入。若編輯器未自動回來，請貼上一次性貼碼後按「貼上並完成連線」。";
    this.emit();
    await this.options.openExternal(url);
    return { needsReload: false };
  }

  /** Called from UriHandler or paste-code UI. */
  async acceptHandoffInput(raw: string): Promise<RouterLaneActionResult> {
    if (this.blockIfUnsupported()) {
      return { needsReload: false };
    }
    const token = parseHandoffToken(raw);
    if (!token) {
      this.status = "error";
      this.detail = "無法辨識 Sign-in Handoff，請重新登入或貼上完整一次性貼碼。";
      this.emit();
      return { needsReload: false };
    }
    this.pendingHandoff = token;
    if (!this.inviteCode.trim()) {
      this.status = "awaiting_sign_in";
      this.detail =
        "已收到登入證明。請輸入邀請碼後按「貼上並完成連線」。";
      this.emit();
      return { needsReload: false };
    }
    return this.redeemAndSetup();
  }

  async redeemAndSetup(): Promise<RouterLaneActionResult> {
    if (this.blockIfUnsupported()) {
      return { needsReload: false };
    }
    const invite = this.inviteCode.trim();
    if (!invite) {
      this.status = "error";
      this.detail = "請先輸入邀請碼。";
      this.emit();
      return { needsReload: false };
    }
    if (!this.pendingHandoff) {
      this.status = "awaiting_sign_in";
      this.detail =
        "尚未收到登入證明。請按「重新連線登入」，或貼上一次性貼碼後按「貼上並完成連線」。";
      this.emit();
      return { needsReload: false };
    }

    this.status = "busy";
    this.detail = "兌換中…";
    this.emit();

    const handoff = this.pendingHandoff;
    try {
      // Fetch template before redeem so a template failure does not burn the handoff.
      const template = await this.client.fetchChatLanguageModelsTemplate();
      const redeemed = await this.client.redeemWithHandoff(handoff, invite);
      this.pendingHandoff = undefined;

      const apiKeyRef = toChatLmSecretInputRef(CLASSROOM_CHAT_LM_SECRET_KEY);
      const write = this.options.writeByok ?? writeByokFile;
      const userDir = this.options.resolveUserDir();
      const target = await write({
        userDir,
        template,
        apiKey: apiKeyRef,
      });

      const secretKey = this.options.apiKeySecretKey ?? "classroomApiKey";
      await this.options.secretStore.store(secretKey, redeemed.api_key);
      await this.options.secretStore.store(
        CLASSROOM_CHAT_LM_SECRET_KEY,
        redeemed.api_key,
      );

      // Prefer promote-with-retry after secrets.store (extension host often has no safeStorage).
      const writeHost =
        this.options.writeHostSecret ??
        ((args: {
          stateDbPath: string;
          plaintext: string;
          extensionId: string;
        }) => ensureHostChatLmSecret(args));
      await writeHost({
        stateDbPath: hostStateDbPath(userDir),
        plaintext: redeemed.api_key,
        extensionId: this.options.extensionId,
      });

      this.classLabel =
        [redeemed.session.class_name, redeemed.session.name].filter(Boolean).join(" · ") ||
        undefined;
      this.expiresAt = redeemed.session.expires_at;
      this.status = "ready";
      this.detail = `已完成 BYOK 設定（${target}）。請按右下角「重新啟動」，然後${selectClassroomChatProviderHint()}；勿只重載視窗。`;
      this.emit();
      return { needsReload: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.status = "error";
      this.detail = message;
      this.emit();
      return { needsReload: false };
    }
  }

  async clearClassroomConnection(): Promise<RouterLaneActionResult> {
    if (this.blockIfUnsupported()) {
      return { needsReload: false };
    }
    this.status = "busy";
    this.detail = "清除中…";
    this.emit();
    try {
      const userDir = this.options.resolveUserDir();
      const clear = this.options.clearByok ?? clearClassroomConnection;
      await clear({
        userDir,
        stateDbPath: hostStateDbPath(userDir),
        deleteSecret: async (key) => {
          await this.options.secretStore.delete(key);
        },
        apiKeySecretKey: this.options.apiKeySecretKey,
      });
      this.inviteCode = "";
      this.pendingHandoff = undefined;
      this.classLabel = undefined;
      this.expiresAt = undefined;
      this.status = "idle";
      this.detail =
        "已清除課堂連線。請按右下角「重新啟動」；若要再連線請重新兌換。";
      this.emit();
      return { needsReload: true };
    } catch (err) {
      this.status = "error";
      if (isHostStateDbBusyError(err)) {
        this.detail = clearClassroomConnectionBusyMessage();
        this.emit();
        return { needsReload: false, offerRestart: true };
      }
      const message = err instanceof Error ? err.message : String(err);
      this.detail = message;
      this.emit();
      return { needsReload: false };
    }
  }

  async restoreFromSecrets(): Promise<void> {
    if (this.unsupportedHost) {
      return;
    }
    const secretKey = this.options.apiKeySecretKey ?? "classroomApiKey";
    const key = await this.options.secretStore.get(secretKey);
    if (isPlainClassroomApiKey(key)) {
      if (this.status === "idle") {
        this.status = "ready";
        this.detail = "Classroom API Key 已設定。";
        this.emit();
      }
    }
  }

  private blockIfUnsupported(): boolean {
    if (!this.unsupportedHost) {
      return false;
    }
    this.status = "error";
    this.detail = CURSOR_BLOCK_DETAIL;
    this.emit();
    return true;
  }

  private emit(): void {
    this.emitter.emit("change");
  }
}
