import ollama from "ollama";
import { readOllamaConfig } from "../config/ollamaConfig.ts";
import chalk from "chalk";

export const ensureModelAvailable = async (): Promise<boolean> => {
    if(!await checkOllamaAvailable()){
        return false;
    }
    try{
        const res = await ollama.list();
        const hasEmbeddingModel = res.models.some((model: any) => {
            return model.capabilities.some((item: string) => item === "embedding");
        })
        return hasEmbeddingModel;
    }catch(err){
        return false;
    }
}

export const checkOllamaAvailable = async (): Promise<boolean> =>  {
  try {
    const res = await ollama.version();
    return typeof res.version === "string";
  } catch {
    return false;
  }
}

export const generateEmbeddings = async (snippetContent: string): Promise<number[][] | undefined> => {
    if(!snippetContent) return;
    try{
        const ollamaConfig = readOllamaConfig();
        if (!ollamaConfig?.model) throw new Error("Ollama model not configured");

        const res = await ollama.embed({
            model: ollamaConfig.model,
            input: snippetContent,
            truncate: true,
        });
        return res.embeddings;
    }
    catch(err){
        console.log(chalk.red("Could not generate embeddings:", err))
        return;
    }
}

export const printOllamaRequired = async (): Promise<boolean> => {
    let res = true;
    if(!await checkOllamaAvailable()){
        console.log(chalk.red(
        `\n❌ Ollama is required for AI search but is not installed or not running.
        📥 Follow Installation instructions at:-
        https://ollama.com/download
        After downloading, Open Ollama App OR Start Ollama server:
        "ollama serve"
        Then try again: snippd ai "<your-query>"`
        ));
        res = false;
    }
    
    if(!await ensureModelAvailable()){
        console.log(chalk.red(`
        ❌ \nNone of your downloaded models have embedding capabilities. 
        Search and download any embedding model from https://ollama.com/search?c=embedding and please try again.
        `));
        res = false;
    }

    return res;
}