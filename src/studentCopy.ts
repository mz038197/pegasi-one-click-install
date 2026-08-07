import { CLASSROOM_CHAT_PROVIDER_MATCH } from "./hostLmSecret";

/** Student-facing select-model hint: neutral + parenthetical Classroom Chat Provider name. */
export function selectClassroomChatProviderHint(
  providerName: string = CLASSROOM_CHAT_PROVIDER_MATCH.name,
): string {
  return `選課堂已設定的模型（清單裡的 ${providerName}）`;
}

/** Clear Classroom Connection confirm: same copy pattern as select hint. */
export function clearClassroomConnectionConfirmMessage(
  providerName: string = CLASSROOM_CHAT_PROVIDER_MATCH.name,
): string {
  return `確定清除課堂連線？將移除課堂模型 provider（清單裡的 ${providerName}）與本機 Classroom API Key，其他模型設定不受影響。`;
}

/** When Host state.vscdb stays busy after the wait budget. */
export function clearClassroomConnectionBusyMessage(): string {
  return "無法清除課堂連線（本機忙碌）。請重新啟動後再試一次清除。";
}
