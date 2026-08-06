import type { ChatLanguageModelProvider } from "./byokSetup";

/**
 * Stable Host secret key for Classroom API Key (VS Code Language Models).
 * Id suffix must be hex (optionally signed), matching VS Code's
 * `hash(uuid).toString(16)` shape — non-hex ids like `pegasi-classroom` are not resolved.
 */
export const CLASSROOM_CHAT_LM_SECRET_KEY = "chat.lm.secret.-7a55c1a5";

export function toChatLmSecretInputRef(secretKey: string): string {
  return `\${input:${secretKey}}`;
}

export function isChatLmSecretInputRef(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith("${input:chat.lm.secret.");
}

export function isPlainClassroomApiKey(value: string | undefined): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith("vcr_sk_") || value.startsWith("pegasi_sk_"))
  );
}

export const VCROUTER_PROVIDER_MATCH = {
  name: "VCRouter",
  vendor: "customendpoint",
} as const;

export function applyHostSecretRefToProviders(
  providers: ChatLanguageModelProvider[],
  match: { name: string; vendor: string },
  apiKeyRef: string,
): ChatLanguageModelProvider[] {
  return providers.map((provider) => {
    if (provider.name === match.name && provider.vendor === match.vendor) {
      return { ...provider, apiKey: apiKeyRef };
    }
    return provider;
  });
}

export function removeMatchingProviders(
  providers: ChatLanguageModelProvider[],
  match: { name: string; vendor: string },
): ChatLanguageModelProvider[] {
  return providers.filter(
    (provider) =>
      !(provider.name === match.name && provider.vendor === match.vendor),
  );
}

/** True when Host is Cursor — classroom auto BYOK is out of scope. */
export function isUnsupportedByokHost(uriScheme: string): boolean {
  return (uriScheme || "").toLowerCase() === "cursor";
}
