import { Ollama } from "ollama";
import { readOllamaConfig } from "@/src/config/ollamaConfig.ts";
import chalk from "chalk";
import type { SnippetWithTags } from "@/src/types/index.ts";

function getOllamaClient(): Ollama {
    const config = readOllamaConfig();
    return new Ollama({ host: config?.api || "http://localhost:11434" });
}

function normalizeModelName(name: string): string {
    return name.trim().toLowerCase();
}

function modelNamesMatch(configured: string, listed: string): boolean {
    const a = normalizeModelName(configured);
    const b = normalizeModelName(listed);
    return a === b || b.startsWith(`${a}:`) || a.startsWith(`${b}:`);
}

export const checkOllamaAvailable = async (): Promise<boolean> => {
    try {
        const res = await getOllamaClient().version();
        return typeof res.version === "string";
    } catch {
        return false;
    }
};

/** True when the configured OLLAMA_MODEL is installed and reports embedding capability. */
export const ensureConfiguredModelAvailable = async (): Promise<boolean> => {
    const config = readOllamaConfig();
    if (!config?.model?.trim()) return false;
    if (!(await checkOllamaAvailable())) return false;

    try {
        const res = await getOllamaClient().list();
        return res.models.some((model) => {
            const name = (model as { name?: string; model?: string }).name
                ?? (model as { model?: string }).model
                ?? "";
            if (!modelNamesMatch(config.model, name)) return false;
            const caps = (model as { capabilities?: string[] }).capabilities;
            if (!caps || caps.length === 0) return true;
            return caps.includes("embedding");
        });
    } catch {
        return false;
    }
};


export const buildEmbedText = (snippet: { snippet: string }): string => {
    return snippet.snippet;
};

export const generateEmbedding = async (text: string): Promise<Float32Array | undefined> => {
    const batch = await generateEmbeddingsBatch([text]);
    return batch?.[0];
};

/** Embed many texts in one Ollama request. Returns one vector per input (same order), or undefined on hard failure. */
export const generateEmbeddingsBatch = async (
    texts: string[],
): Promise<(Float32Array | undefined)[] | undefined> => {
    if (texts.length === 0) return [];
    try {
        const ollamaConfig = readOllamaConfig();
        if (!ollamaConfig?.model?.trim()) throw new Error("Ollama model not configured");

        const res = await getOllamaClient().embed({
            model: ollamaConfig.model,
            input: texts.length === 1 ? texts[0]! : texts,
            truncate: true,
        });

        const vectors = res.embeddings ?? [];
        return texts.map((_, i) => {
            const vector = vectors[i];
            return vector?.length ? Float32Array.from(vector) : undefined;
        });
    } catch (err) {
        console.log(chalk.red("Could not generate embeddings:", err));
        return undefined;
    }
};

export const printOllamaRequired = async (): Promise<boolean> => {
    let ok = true;
    const config = readOllamaConfig();

    if (!(await checkOllamaAvailable())) {
        console.log(chalk.red(
        `\n❌ Ollama is required for AI search but is not installed or not running.
        📥 Follow installation instructions at:
        https://ollama.com/download
        After downloading, open the Ollama app or start the server:
        ollama serve
        Then try again: snippd ai "<your-query>"`,
        ));
        ok = false;
    }

    if (!config?.model?.trim()) {
        console.log(chalk.red(
        `\n❌ OLLAMA_MODEL is not set.
        Run:
        ollama pull <model-name>,
        Then set the model:
        snippd config set OLLAMA_MODEL <model-name>`
        ));
        ok = false;
        return ok;
    }

    if (!(await ensureConfiguredModelAvailable())) {
        console.log(chalk.red(
        `\n❌ Configured model "${config.model}" is missing or does not support embeddings.
        Pull an embedding model, e.g. nomic-embed-text
        Browse other models at: https://ollama.com/search?c=embedding`,
        ));
        ok = false;
    }

    return ok;
};
