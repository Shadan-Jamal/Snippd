import { readConfigFile } from "./snippdConfig.ts";

export const readOllamaConfig = (): { api: string, model: string } | undefined => {
  const configFile = readConfigFile();
  if (!configFile) return;

  const { OLLAMA_API, OLLAMA_MODEL } = configFile;
  if (!OLLAMA_API?.length && !OLLAMA_MODEL?.length) return;

  return {
    api: OLLAMA_API || "http://localhost:11434",
    model: OLLAMA_MODEL || "",
  };
};