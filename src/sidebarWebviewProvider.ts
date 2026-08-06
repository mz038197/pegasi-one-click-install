import * as vscode from "vscode";
import type { CourseLaneService } from "./courseLaneService";
import type { EnvironmentLaneService } from "./environmentLane";
import type { RouterLaneService } from "./routerLaneService";
import type { EnvironmentToolId } from "./toolProbe";
import { buildSidebarViewModel } from "./sidebarViewModel";
import { getSidebarWebviewHtml } from "./sidebarWebviewHtml";
import { workspaceDisplayName } from "./workspaceDisplayName";

const VIEW_TYPE = "pegasiClassroomInstall.sidebar";

type WebviewInbound =
  | { type: "ready" }
  | { type: "recheck" }
  | { type: "installEnv"; toolId: EnvironmentToolId }
  | { type: "runAction"; actionId: string }
  | { type: "setInviteCode"; inviteCode: string }
  | { type: "routerSignIn" }
  | { type: "routerRedeem" }
  | { type: "routerClear" }
  | { type: "routerHandoffPaste"; raw: string }
  | { type: "retryRemoteCatalog" };

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = VIEW_TYPE;

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly courseLane: CourseLaneService,
    private readonly environmentLane: EnvironmentLaneService,
    private readonly routerLane: RouterLaneService,
    private readonly handlers: {
      recheck: () => Promise<void>;
      installEnv: (toolId: EnvironmentToolId) => Promise<void>;
      runAction: (actionId: string) => Promise<void>;
      routerSignIn: () => Promise<void>;
      routerRedeem: () => Promise<void>;
      routerClear: () => Promise<void>;
      routerHandoffPaste: (raw: string) => Promise<void>;
      retryRemoteCatalog: () => Promise<void>;
    },
  ) {}

  refresh(): void {
    void this.postState();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    const { webview } = webviewView;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    const scriptUri = webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "sidebar.js"))
      .toString();
    webview.html = getSidebarWebviewHtml(webview.cspSource, scriptUri);

    webview.onDidReceiveMessage((raw: WebviewInbound) => {
      void this.onMessage(raw);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.postState();
      }
    });

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
    });

    void this.postState();
  }

  private async onMessage(msg: WebviewInbound): Promise<void> {
    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      return;
    }
    switch (msg.type) {
      case "ready":
        await this.postState();
        return;
      case "recheck":
        await this.handlers.recheck();
        return;
      case "installEnv":
        if (isToolId(msg.toolId)) {
          await this.handlers.installEnv(msg.toolId);
        }
        return;
      case "runAction":
        if (typeof msg.actionId === "string" && msg.actionId.trim()) {
          await this.handlers.runAction(msg.actionId);
        }
        return;
      case "setInviteCode":
        if (typeof msg.inviteCode === "string") {
          this.routerLane.setInviteCode(msg.inviteCode);
        }
        return;
      case "routerSignIn":
        await this.handlers.routerSignIn();
        return;
      case "routerRedeem":
        await this.handlers.routerRedeem();
        return;
      case "routerClear":
        await this.handlers.routerClear();
        return;
      case "routerHandoffPaste":
        if (typeof msg.raw === "string") {
          await this.handlers.routerHandoffPaste(msg.raw);
        }
        return;
      case "retryRemoteCatalog":
        await this.handlers.retryRemoteCatalog();
        return;
      default:
        return;
    }
  }

  private async postState(): Promise<void> {
    if (!this.view) {
      return;
    }
    const folders = vscode.workspace.workspaceFolders?.map((f) => ({
      name: f.name,
    }));
    const iconUri = this.view.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "brand-logo.png"))
      .toString();
    const payload = {
      ...buildSidebarViewModel({
        workspaceName: workspaceDisplayName(folders),
        router: this.routerLane.getView(),
        environment: this.environmentLane.getView(),
        course: this.courseLane.getView(),
      }),
      iconUri,
    };
    await this.view.webview.postMessage({ type: "state", payload });
  }
}

function isToolId(value: unknown): value is EnvironmentToolId {
  return value === "uv" || value === "git" || value === "node";
}
