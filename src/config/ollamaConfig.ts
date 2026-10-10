import axios from "axios";
import fs from "node:fs"
import { CONFIG_FILE, configFileExists } from "./snippdConfig.ts";
import { SnippdConfig } from "../types/index.ts";

export const readOllamaConfig = () => {
  if (!configFileExists()) return {};
  try {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw) as SnippdConfig;
      return typeof parsed === "object" && parsed !== null ? 
      { ollama_api: parsed.OLLAMA_API, ollama_model: parsed.OLLAMA_MODEL} 
      : {};
  } catch {
      return {};
  }
}

export const checkOllamaAvailable = async (): Promise<boolean> =>  {
  try {
    const ollama_api = readOllamaConfig().ollama_api as string;
    const response = await axios.get(ollama_api, { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
}