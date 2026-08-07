import fs from "node:fs/promises";
import type { ChatLanguageModelProvider } from "./byokSetup";
import { chatLanguageModelsPath } from "./editorUserPath";
import {
  CLASSROOM_CHAT_LM_SECRET_KEY,
  CLASSROOM_CHAT_PROVIDER_MATCH,
  removeMatchingProviders,
} from "./hostLmSecret";
import { deleteHostChatLmSecret } from "./hostStateDb";

/**
 * Clear Classroom Connection: remove Classroom API Key (Host + extension), then
 * Classroom Chat Provider from models JSON. Does not touch other providers.
 */
export async function clearClassroomConnection(options: {
  userDir: string;
  stateDbPath: string;
  deleteSecret: (key: string) => Promise<void>;
  apiKeySecretKey?: string;
  readFile?: (path: string) => Promise<string>;
  writeFile?: (path: string, data: string) => Promise<void>;
  deleteHostSecret?: (args: {
    stateDbPath: string;
    secretKey?: string;
  }) => Promise<void>;
}): Promise<{ modelsPath: string }> {
  const modelsPath = chatLanguageModelsPath(options.userDir);
  const readFile = options.readFile ?? ((p) => fs.readFile(p, "utf8"));
  const writeFile = options.writeFile ?? ((p, d) => fs.writeFile(p, d, "utf8"));
  const deleteHost = options.deleteHostSecret ?? deleteHostChatLmSecret;

  await deleteHost({
    stateDbPath: options.stateDbPath,
    secretKey: CLASSROOM_CHAT_LM_SECRET_KEY,
  });
  const apiKeySecretKey = options.apiKeySecretKey ?? "classroomApiKey";
  await options.deleteSecret(apiKeySecretKey);
  await options.deleteSecret(CLASSROOM_CHAT_LM_SECRET_KEY);

  try {
    const raw = await readFile(modelsPath);
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const next = removeMatchingProviders(
        parsed as ChatLanguageModelProvider[],
        CLASSROOM_CHAT_PROVIDER_MATCH,
      );
      await writeFile(modelsPath, `${JSON.stringify(next, null, 2)}\n`);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw err;
    }
  }

  return { modelsPath };
}
