import * as vscode from "vscode";
import { CATALOG_FILENAME, CourseLaneService } from "./courseLaneService";
import {
  confirmEnvironmentInstall,
  detectInstallPlatform,
  executeEnvironmentInstallPlan,
} from "./environmentInstallExecutor";
import { EnvironmentLaneService } from "./environmentLane";
import { resolveEditorUserDir } from "./editorUserPath";
import {
  PENDING_HOST_BYOK_STATE_KEY,
  finalizePendingHostByok,
  type PendingHostByok,
} from "./pendingHostByok";
import {
  buildRelaunchAfterQuitPlan,
  scheduleRelaunchAfterQuit,
} from "./relaunchHost";
import { createDefaultProbeRunner } from "./probeRunner";
import type { EnvironmentToolId } from "./toolProbe";
import {
  createRouterPortalClient,
  defaultRouterBaseUrl,
} from "./routerPortalClient";
import {
  RouterLaneService,
  type RouterLaneActionResult,
} from "./routerLaneService";
import {
  INSTALL_ENVIRONMENT_TOOL_COMMAND,
  RECHECK_ENVIRONMENT_COMMAND,
  RUN_INSTALL_ACTION_COMMAND,
} from "./sidebarCommands";
import { SidebarWebviewProvider } from "./sidebarWebviewProvider";
import {
  clearClassroomConnectionConfirmMessage,
  selectClassroomChatProviderHint,
} from "./studentCopy";

const API_KEY_SECRET = "classroomApiKey";

const BYOK_RESTART_MESSAGE = `BYOK 已寫入。請重新啟動 VS Code（勿只按重載視窗），再開啟後${selectClassroomChatProviderHint()}。`;
const CLEAR_RESTART_MESSAGE =
  "已清除課堂連線。請重新啟動 VS Code，變更才會穩定生效。";
const RESTART_ACTION = "重新啟動";
const LATER_ACTION = "稍後";

export function activate(context: vscode.ExtensionContext): void {
  const environmentLane = new EnvironmentLaneService(createDefaultProbeRunner(), {
    platform: detectInstallPlatform(),
    confirm: confirmEnvironmentInstall,
    execute: executeEnvironmentInstallPlan,
  });
  const baseUrl = defaultRouterBaseUrl((key) =>
    vscode.workspace.getConfiguration().get(key),
  );
  const portalClient = createRouterPortalClient(baseUrl);

  const courseLane = new CourseLaneService(() => environmentLane.getReadiness(), {
    getApiKey: async () => context.secrets.get(API_KEY_SECRET),
    fetchRemoteYaml: (apiKey) => portalClient.fetchCourseCatalogYaml(apiKey),
  });

  const resolveUserDir = (): string =>
    resolveEditorUserDir({
      platform: process.platform,
      uriScheme: vscode.env.uriScheme,
    });

  const routerLane = new RouterLaneService(portalClient, {
    baseUrl,
    openExternal: (url) => vscode.env.openExternal(vscode.Uri.parse(url)),
    resolveUserDir,
    uriScheme: vscode.env.uriScheme,
    extensionId: context.extension.id,
    secretStore: {
      get: (key) => context.secrets.get(key),
      store: (key, value) => context.secrets.store(key, value),
      delete: (key) => context.secrets.delete(key),
    },
    apiKeySecretKey: API_KEY_SECRET,
  });

  let catalogWatcher: vscode.FileSystemWatcher | undefined;

  const markPendingHostByok = async (): Promise<void> => {
    const pending: PendingHostByok = {
      extensionId: context.extension.id,
      userDir: resolveUserDir(),
    };
    await context.globalState.update(PENDING_HOST_BYOK_STATE_KEY, pending);
  };

  const offerFullRestart = async (message: string): Promise<void> => {
    const choice = await vscode.window.showInformationMessage(
      message,
      RESTART_ACTION,
      LATER_ACTION,
    );
    if (choice !== RESTART_ACTION) {
      return;
    }
    const openPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const scheduled = scheduleRelaunchAfterQuit(
      buildRelaunchAfterQuitPlan({
        platform: process.platform,
        execPath: process.execPath,
        openPath,
      }),
    );
    if (!scheduled) {
      await vscode.window.showErrorMessage(
        "無法排程自動重開，已取消退出。請手動關閉並再開 VS Code（勿只按重載視窗）。",
      );
      return;
    }
    await vscode.commands.executeCommand("workbench.action.quit");
  };

  const afterRouterAction = async (
    result: RouterLaneActionResult,
    restartMessage: string,
    markPending: boolean,
  ): Promise<void> => {
    refreshUi();
    if (result.needsReload) {
      if (markPending) {
        await markPendingHostByok();
      }
      await offerFullRestart(restartMessage);
    }
  };

  const provider = new SidebarWebviewProvider(
    context.extensionUri,
    courseLane,
    environmentLane,
    routerLane,
    {
      recheck: () => recheckEnvironment(),
      installEnv: (toolId) => installEnvironmentTool(toolId),
      runAction: async (actionId) => {
        await courseLane.runAction(actionId);
      },
      routerSignIn: async () => {
        await routerLane.openGoogleSignIn();
        refreshUi();
      },
      routerRedeem: async () => {
        const result = await routerLane.redeemAndSetup();
        reloadCatalog();
        await afterRouterAction(result, BYOK_RESTART_MESSAGE, true);
      },
      routerClear: async () => {
        const confirm = await vscode.window.showWarningMessage(
          clearClassroomConnectionConfirmMessage(),
          { modal: true },
          "清除",
        );
        if (confirm !== "清除") {
          return;
        }
        const result = await routerLane.clearClassroomConnection();
        // Only drop pending Host rewrite after a successful clear; failures keep
        // the marker so activate can still finalize BYOK.
        if (result.needsReload) {
          await context.globalState.update(
            PENDING_HOST_BYOK_STATE_KEY,
            undefined,
          );
        }
        reloadCatalog();
        await afterRouterAction(result, CLEAR_RESTART_MESSAGE, false);
      },
      routerHandoffPaste: async (raw) => {
        const result = await routerLane.acceptHandoffInput(raw);
        reloadCatalog();
        await afterRouterAction(result, BYOK_RESTART_MESSAGE, true);
      },
      retryRemoteCatalog: async () => {
        reloadCatalog();
      },
    },
  );

  const refreshUi = (): void => {
    provider.refresh();
  };

  const reloadCatalog = (): void => {
    void courseLane.reload().then(refreshUi);
  };

  const recheckEnvironment = async (): Promise<void> => {
    await environmentLane.recheck();
    refreshUi();
  };

  const installEnvironmentTool = async (toolId: EnvironmentToolId): Promise<void> => {
    const result = await environmentLane.installTool(toolId);
    refreshUi();
    if (result === "ran") {
      void vscode.window.showInformationMessage(
        "安裝流程已結束。請重開整合終端機後再按「重新檢查」。",
      );
    } else if (result === "failed") {
      const detail =
        environmentLane.getView().tools.find((t) => t.id === toolId)?.detail ??
        "安裝失敗";
      void vscode.window.showErrorMessage(detail);
    }
  };

  const watchCatalog = (): void => {
    catalogWatcher?.dispose();
    catalogWatcher = undefined;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return;
    }
    catalogWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(folder, CATALOG_FILENAME),
    );
    catalogWatcher.onDidCreate(reloadCatalog);
    catalogWatcher.onDidChange(reloadCatalog);
    catalogWatcher.onDidDelete(reloadCatalog);
  };

  context.subscriptions.push(
    courseLane,
    {
      dispose: () => {
        catalogWatcher?.dispose();
      },
    },
    vscode.window.registerWebviewViewProvider(
      SidebarWebviewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        void (async () => {
          const result = await routerLane.acceptHandoffInput(
            uri.toString(true),
          );
          reloadCatalog();
          await afterRouterAction(result, BYOK_RESTART_MESSAGE, true);
          await vscode.commands.executeCommand(
            "workbench.view.extension.pegasiClassroomInstall",
          );
        })();
      },
    }),
    vscode.commands.registerCommand(RUN_INSTALL_ACTION_COMMAND, (actionId: string) => {
      void courseLane.runAction(actionId);
    }),
    vscode.commands.registerCommand(RECHECK_ENVIRONMENT_COMMAND, () => {
      void recheckEnvironment();
    }),
    vscode.commands.registerCommand(
      INSTALL_ENVIRONMENT_TOOL_COMMAND,
      (toolId: EnvironmentToolId) => {
        void installEnvironmentTool(toolId);
      },
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      watchCatalog();
      reloadCatalog();
      void recheckEnvironment();
    }),
    courseLane.onDidChange(refreshUi),
    routerLane.onDidChange(refreshUi),
  );

  watchCatalog();
  void recheckEnvironment();
  void routerLane.restoreFromSecrets().then(() => {
    reloadCatalog();
    refreshUi();
  });

  void (async () => {
    const pending = context.globalState.get<PendingHostByok>(
      PENDING_HOST_BYOK_STATE_KEY,
    );
    const finalized = await finalizePendingHostByok({
      pending,
      getApiKey: () => Promise.resolve(context.secrets.get(API_KEY_SECRET)),
      clearPending: () =>
        Promise.resolve(
          context.globalState.update(PENDING_HOST_BYOK_STATE_KEY, undefined),
        ),
    });
    if (finalized === "wrote") {
      void vscode.window.showInformationMessage(
        `已在啟動時寫入 Host Classroom API Key。請${selectClassroomChatProviderHint()}試試。`,
      );
    }
  })();
}

export function deactivate(): void {
  // no-op
}
