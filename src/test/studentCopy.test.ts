import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearClassroomConnectionBusyMessage,
  clearClassroomConnectionConfirmMessage,
  selectClassroomChatProviderHint,
} from "../studentCopy";

describe("studentCopy (Classroom Chat Provider prompts)", () => {
  it("select hint names Pegasi Router as the Classroom Chat Provider", () => {
    const text = selectClassroomChatProviderHint("Pegasi Router");
    assert.equal(text, "選課堂已設定的模型（清單裡的 Pegasi Router）");
  });

  it("clear confirm names Pegasi Router as the Classroom Chat Provider", () => {
    const text = clearClassroomConnectionConfirmMessage("Pegasi Router");
    assert.equal(
      text,
      "確定清除課堂連線？將移除課堂模型 provider（清單裡的 Pegasi Router）與本機 Classroom API Key，其他模型設定不受影響。",
    );
  });

  it("defaults to Classroom Chat Provider match name", () => {
    assert.match(selectClassroomChatProviderHint(), /清單裡的 Pegasi Router/);
    assert.match(
      clearClassroomConnectionConfirmMessage(),
      /清單裡的 Pegasi Router/,
    );
  });

  it("busy clear message stays student-facing without SQLite jargon", () => {
    const text = clearClassroomConnectionBusyMessage();
    assert.equal(
      text,
      "無法清除課堂連線（本機忙碌）。請重新啟動後再試一次清除。",
    );
    assert.doesNotMatch(text, /database is locked/i);
  });
});
