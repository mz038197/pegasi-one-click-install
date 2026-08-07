import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearClassroomConnectionConfirmMessage,
  selectClassroomChatProviderHint,
} from "../studentCopy";

describe("studentCopy (Classroom Chat Provider prompts)", () => {
  it("select hint is neutral with parenthetical provider name, not Pegasi Router", () => {
    const text = selectClassroomChatProviderHint("VCRouter");
    assert.equal(text, "選課堂已設定的模型（清單裡的 VCRouter）");
    assert.doesNotMatch(text, /Pegasi Router/);
  });

  it("clear confirm is neutral with parenthetical provider name, not Pegasi Router", () => {
    const text = clearClassroomConnectionConfirmMessage("VCRouter");
    assert.equal(
      text,
      "確定清除課堂連線？將移除課堂模型 provider（清單裡的 VCRouter）與本機 Classroom API Key，其他模型設定不受影響。",
    );
    assert.doesNotMatch(text, /Pegasi Router/);
  });

  it("defaults to Classroom Chat Provider match name", () => {
    assert.match(selectClassroomChatProviderHint(), /清單裡的 VCRouter/);
    assert.match(clearClassroomConnectionConfirmMessage(), /清單裡的 VCRouter/);
  });
});
