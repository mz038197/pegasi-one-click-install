export type SidebarLaneId = "router" | "environment" | "course";

export type SidebarLane = {
  id: SidebarLaneId;
  title: string;
  placeholder: string;
};

export type SidebarShell = {
  title: string;
  workspaceLabel: string;
  lanes: readonly [SidebarLane, SidebarLane, SidebarLane];
  /** 信任邊界：UI 永不提供學生自訂 shell 命令輸入（邀請碼不算）。 */
  hasCustomCommandInput: false;
};

/** 側邊欄殼：Router Lane → Environment Lane → Course Lane。 */
export function buildSidebarShell(workspaceName: string): SidebarShell {
  return {
    title: "Pegasi 課堂安裝",
    workspaceLabel: `工作區：${workspaceName}`,
    lanes: [
      {
        id: "router",
        title: "課堂連線",
        placeholder: "邀請碼、Google 登入、BYOK 設定",
      },
      {
        id: "environment",
        title: "環境工具",
        placeholder: "uv／git／Node.js 偵測、安裝與重新檢查",
      },
      {
        id: "course",
        title: "本課安裝",
        placeholder: "本課 Install Action 清單",
      },
    ],
    hasCustomCommandInput: false,
  };
}
