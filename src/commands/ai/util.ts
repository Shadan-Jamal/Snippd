import { getOllamaClient, readOllamaConfig } from "@/src/config/ollamaConfig.ts";
import chalk from "chalk";
import { program } from "commander";
import { select, input } from "@inquirer/prompts";
import { assertIndexCompatibleWithConfig } from "@/src/utils/indexSnippet.ts";
import { countIndexed, searchByEmbedding } from "@/db/queries/embeddings.ts";
import { renderSnippetActions, tabulateSnippets } from "@/src/utils/tabulateUtil.ts";

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

export const readOllamaModels = async (): Promise<{ name: string; hasEmbedding: boolean }[]> => {
    const client = getOllamaClient();
    const listRes = await client.list();
    const raw = listRes.models ?? [];

    const parsed = raw.map((m) => {
        const name = (m as { name?: string; model?: string }).name
            ?? (m as { model?: string }).model
            ?? "";
        const caps = (m as { capabilities?: string[] }).capabilities ?? [];
        const hasEmbedding = caps.length === 0 || caps.includes("embedding");
        return { name, hasEmbedding };
    });

    if (parsed.length === 0) {
        console.log(chalk.yellow("\n⚠ No models found in Ollama. Pull one first:\n   ollama pull <model-name>\n"));
        return [];
    }

    return parsed;
}

export const buildEmbedText = (data: { code: string }): string => {
    return data.code;
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
        Pull an embedding model.
        Browse other models at: https://ollama.com/search?c=embedding`,
        ));
        ok = false;
    }

    return ok;
};

export const aiInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack?: () => Promise<void>,
): Promise<void> => {
    const choices: { name: string; value: string }[] = [
        { name: `${chalk.magenta("✦")}  Semantic search`, value: "search" },
        { name: `${chalk.cyan("◎")}  Choose embedding model`, value: "choose" },
        { name: `${chalk.blue("🔄")} Reindex embeddings`, value: "reindex" },
    ];
    if (onBack) {
        choices.push({ name: chalk.yellow("  Back"), value: "back" });
    }

    const aiAction = await select({
        message: chalk.bold("AI options:"),
        choices,
    });

    if (aiAction === "back") {
        if (onBack) await onBack();
        return;
    }

    if (aiAction === "choose") {
        await program.parseAsync([...parseAsyncArgs, "ai", "choose"]);
        return;
    }
    if (aiAction === "reindex") {
        await program.parseAsync([...parseAsyncArgs, "ai", "reindex"]);
        return;
    }
    if (aiAction === "search") {
        const query = await input({ message: "Describe what you're looking for:" });
        if (query.trim()) {
            await program.parseAsync([...parseAsyncArgs, "ai", query.trim()]);
        }
    }
};

export const runSemanticSearch = async (query: string, limitRaw: string): Promise<void> => {
    if (!(await printOllamaRequired())) return;

    const compat = assertIndexCompatibleWithConfig();
    if (!compat.ok) {
        console.log(chalk.red(`\n❌ ${compat.reason}\n`));
        return;
    }

    if (countIndexed() === 0) {
        console.log(chalk.red("\n❌ Embedding index is empty. Run: snippd ai reindex\n"));
        return;
    }

    const k = Math.max(1, Number.parseInt(limitRaw, 10) || 10);

    try {
        const vector = await generateEmbedding(query);
        if (!vector) {
            console.log(chalk.red("\n❌ Could not embed query.\n"));
            return;
        }

        const results = searchByEmbedding(vector, k);
        if (!results.length) {
            console.log(chalk.redBright(`\nNo semantic matches for "${query}".\n`));
            return;
        }

        const selections = tabulateSnippets(results);
        if (selections) {
            await renderSnippetActions(selections, results);
        }
    } catch (err) {
        console.log(chalk.red(`✗ AI search failed: ${err instanceof Error ? err.message : String(err)}\n`));
        process.exitCode = 1;
    }
}