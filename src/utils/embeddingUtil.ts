import ollama from "ollama";
import { readConfigFile } from "../config/snippdConfig.ts";
import chalk from "chalk";
import { checkOllamaAvailable, readOllamaConfig } from "../config/ollamaConfig.ts";

export const ensureModelAvailable = async (): Promise<boolean> => {
    try{
        if(await checkOllamaAvailable()){
            const res = await ollama.list();
            
        }
    }
}