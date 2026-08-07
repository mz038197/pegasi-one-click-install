import { VCROUTER_PROVIDER_MATCH } from "./hostLmSecret";

/** Student-facing select-model hint: neutral + parenthetical Classroom Chat Provider name. */
export function selectClassroomChatProviderHint(
  providerName: string = VCROUTER_PROVIDER_MATCH.name,
): string {
  return `選課堂已設定的模型（清單裡的 ${providerName}）`;
}

/** Clear Classroom Connection confirm: same copy pattern as select hint. */
export function clearClassroomConnectionConfirmMessage(
  providerName: string = VCROUTER_PROVIDER_MATCH.name,
): string {
  return `確定清除課堂連線？將移除課堂模型 provider（清單裡的 ${providerName}）與本機 Classroom API Key，其他模型設定不受影響。`;
}
