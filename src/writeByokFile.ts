import fs from "node:fs/promises";
import type { ChatLanguageModelProvider } from "./byokSetup";
import { mergeByokConfig } from "./byokSetup";
import { chatLanguageModelsPath } from "./editorUserPath";
import { brandClassroomChatProviderTemplate } from "./hostLmSecret";

export async function writeByokFile(options: {
  userDir: string;
  template: ChatLanguageModelProvider[];
  apiKey: string;
  readFile?: (path: string) => Promise<string>;
  writeFile?: (path: string, data: string) => Promise<void>;
  mkdir?: (path: string) => Promise<void>;
}): Promise<string> {
  const target = chatLanguageModelsPath(options.userDir);
  const readFile = options.readFile ?? ((p) => fs.readFile(p, "utf8"));
  const writeFile = options.writeFile ?? ((p, d) => fs.writeFile(p, d, "utf8"));
  const mkdir = options.mkdir ?? ((p) => fs.mkdir(p, { recursive: true }).then(() => undefined));

  let existing: ChatLanguageModelProvider[] = [];
  try {
    const raw = (await readFile(target)).trim();
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existing = parsed as ChatLanguageModelProvider[];
      } else if (parsed && typeof parsed === "object") {
        existing = [parsed as ChatLanguageModelProvider];
      } else {
        throw new Error("chatLanguageModels.json 格式無法辨識");
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      if (err instanceof SyntaxError) {
        throw new Error("既有 chatLanguageModels.json 不是合法 JSON");
      }
      throw err;
    }
  }

  const template = brandClassroomChatProviderTemplate(options.template);
  const merged = mergeByokConfig(existing, template, options.apiKey);
  await mkdir(options.userDir);
  await writeFile(target, `${JSON.stringify(merged, null, 2)}\n`);
  return target;
}
