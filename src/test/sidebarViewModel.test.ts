import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSidebarViewModel } from "../sidebarViewModel";
import type { CourseLaneView } from "../courseLaneTypes";
import type { EnvironmentLaneView } from "../environmentLane";
import type { RouterLaneView } from "../routerLaneService";

const routerIdle: RouterLaneView = {
  status: "idle",
  inviteCode: "",
  detail: "輸入邀請碼",
  showPasteUi: false,
  canRedeem: false,
  canOpenSignIn: false,
  canClear: false,
};

const envReady: EnvironmentLaneView = {
  toolchainReady: true,
  tools: [
    {
      id: "uv",
      label: "uv",
      status: "ready",
      detail: "0.7.0",
      actionLabel: "重新安裝／修復",
    },
    {
      id: "git",
      label: "git",
      status: "ready",
      detail: "2.45.0",
      actionLabel: "重新安裝／修復",
    },
    {
      id: "node",
      label: "Node.js",
      status: "ready",
      detail: "v22.0.0",
      actionLabel: "重新安裝／修復",
    },
  ],
};

describe("buildSidebarViewModel", () => {
  it("places environment above course and keeps shell titles", () => {
    const course: CourseLaneView = {
      kind: "ready",
      workspaceRoot: "/tmp/demo",
      actions: [
        {
          id: "a1",
          title: "安裝 tools",
          kind: "package",
          description: "從 GitHub",
          command: "uv add x",
          run: { status: "idle" },
        },
      ],
    };

    const vm = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course,
    });

    assert.equal(vm.title, "Pegasi 課堂安裝");
    assert.equal(vm.workspaceLabel, "工作區：demo");
    assert.equal(vm.router.signInLabel, "連線登入");
    assert.equal(vm.router.redeemLabel, "貼上並完成連線");
    assert.equal(vm.router.showPasteUi, false);
    assert.equal(vm.router.statusLabel, "尚未設定");
    assert.equal(vm.environment.tools.length, 3);
    assert.equal(vm.course.actions[0]?.title, "安裝 tools");
    assert.equal(vm.course.actions[0]?.kind, "package");
    assert.equal(vm.course.actions[0]?.kindLabel, "套件");
    assert.equal(vm.course.actions[0]?.actionLabel, "安裝");
    assert.equal(vm.hasCustomCommandInput, false);
  });

  it("shows paste UI labels while awaiting Sign-in Handoff", () => {
    const routerAwaiting: RouterLaneView = {
      status: "awaiting_sign_in",
      inviteCode: "ABC",
      detail: "已開啟瀏覽器",
      showPasteUi: true,
      canRedeem: true,
      canOpenSignIn: true,
      canClear: false,
    };
    const vm = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerAwaiting,
      environment: envReady,
      course: { kind: "ready", workspaceRoot: "/tmp/demo", actions: [] },
    });
    assert.equal(vm.router.showPasteUi, true);
    assert.equal(vm.router.signInLabel, "重新連線登入");
    assert.equal(vm.router.redeemLabel, "貼上並完成連線");
  });

  it("surfaces disabled reason and does not offer a run label action", () => {
    const course: CourseLaneView = {
      kind: "ready",
      workspaceRoot: "/tmp/demo",
      actions: [
        {
          id: "needs-git",
          title: "安裝 runtime",
          kind: "package",
          command: "uv add git+https://example.com/x.git",
          run: { status: "idle" },
          disabledReason: "需要 git",
        },
      ],
    };

    const vm = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course,
    });

    assert.equal(vm.course.actions[0]?.disabledReason, "需要 git");
    assert.equal(vm.course.actions[0]?.busy, false);
    assert.equal(vm.course.actions[0]?.canRun, false);
  });

  it("maps course empty states to a clear message", () => {
    const vm = buildSidebarViewModel({
      workspaceName: "none",
      router: routerIdle,
      environment: envReady,
      course: { kind: "missing", message: "找不到 classroom-installs.yaml" },
    });
    assert.match(vm.course.emptyMessage ?? "", /找不到/);
    assert.equal(vm.course.actions.length, 0);
  });

  it("shows student-facing toolchain badge copy without listing tools", () => {
    const ready = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course: { kind: "ready", workspaceRoot: "/tmp/demo", actions: [] },
    });
    assert.equal(ready.environment.badge, "環境工具皆就緒");

    const notReady: EnvironmentLaneView = {
      ...envReady,
      toolchainReady: false,
      tools: envReady.tools.map((t, i) =>
        i === 0 ? { ...t, status: "missing", detail: "未安裝", actionLabel: "安裝" } : t,
      ),
    };
    const incomplete = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: notReady,
      course: { kind: "ready", workspaceRoot: "/tmp/demo", actions: [] },
    });
    assert.equal(incomplete.environment.badge, "環境工具未齊");
  });

  it("does not expose Course Catalog filename as a source label", () => {
    const withActions = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course: {
        kind: "ready",
        workspaceRoot: "/tmp/demo",
        actions: [
          {
            id: "a1",
            title: "安裝 tools",
            kind: "package",
            command: "uv add x",
            run: { status: "idle" },
          },
        ],
      },
    });
    const emptyCatalog = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course: { kind: "ready", workspaceRoot: "/tmp/demo", actions: [] },
    });
    const missing = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: envReady,
      course: { kind: "missing", message: "找不到 classroom-installs.yaml" },
    });
    assert.equal("sourceLabel" in withActions.course, false);
    assert.equal("sourceLabel" in emptyCatalog.course, false);
    assert.equal("sourceLabel" in missing.course, false);
    assert.match(missing.course.emptyMessage ?? "", /classroom-installs\.yaml/);
  });

  it("marks installing env tools and running actions as busy", () => {
    const env: EnvironmentLaneView = {
      toolchainReady: false,
      tip: "請重開終端",
      tools: [
        {
          id: "uv",
          label: "uv",
          status: "installing",
          detail: "安裝中…",
          actionLabel: "安裝",
        },
        {
          id: "git",
          label: "git",
          status: "missing",
          detail: "未安裝",
          actionLabel: "安裝",
        },
        {
          id: "node",
          label: "Node.js",
          status: "ready",
          detail: "v22",
          actionLabel: "重新安裝／修復",
        },
      ],
    };
    const course: CourseLaneView = {
      kind: "ready",
      workspaceRoot: "/tmp/demo",
      actions: [
        {
          id: "a1",
          title: "安裝 tools",
          kind: "skill",
          command: "uv add x",
          run: { status: "running" },
        },
      ],
    };

    const vm = buildSidebarViewModel({
      workspaceName: "demo",
      router: routerIdle,
      environment: env,
      course,
    });

    assert.equal(vm.environment.tools[0]?.busy, true);
    assert.equal(vm.environment.tools[0]?.canRun, false);
    assert.equal(vm.course.actions[0]?.busy, true);
    assert.equal(vm.course.actions[0]?.canRun, false);
    assert.ok(vm.environment.tip);
  });
});
