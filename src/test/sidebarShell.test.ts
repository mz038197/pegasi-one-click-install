import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSidebarShell } from "../sidebarShell";

describe("buildSidebarShell", () => {
  it("places Router above Environment above Course with workspace label", () => {
    const shell = buildSidebarShell("my-course-project");

    assert.equal(shell.title, "Pegasi 課堂安裝");
    assert.equal(shell.workspaceLabel, "工作區：my-course-project");
    assert.deepEqual(
      shell.lanes.map((lane) => lane.id),
      ["router", "environment", "course"],
    );
    assert.equal(shell.lanes[0]?.title, "課堂連線");
    assert.equal(shell.lanes[1]?.title, "環境工具");
    assert.equal(shell.lanes[2]?.title, "本課安裝");
  });

  it("does not expose a custom command input", () => {
    const shell = buildSidebarShell("demo");
    assert.equal(shell.hasCustomCommandInput, false);
  });

  it("uses placeholders for lane bodies in the scaffold", () => {
    const shell = buildSidebarShell("demo");
    assert.ok(shell.lanes[0]?.placeholder);
    assert.ok(shell.lanes[1]?.placeholder);
    assert.ok(shell.lanes[2]?.placeholder);
  });
});
