import { Command } from "commander";
import chalk from "chalk";
import { printOllamaRequired, checkOllamaAvailable, runSemanticSearch, readOllamaModels } from "../ai/util.ts";
import { reindexAllSnippets } from "@/src/utils/indexSnippet.ts";
import { select, confirm } from "@inquirer/prompts";
import { Ollama } from "ollama";
import { readOllamaConfig } from "@/src/config/ollamaConfig.ts";
import { setConfigKey } from "@/src/config/snippdConfig.ts";

const ai = new Command();

ai
    .name("ai")
    .description("Semantic search across snippets using local Ollama embeddings.");

ai
    .command("reindex")
    .description("Rebuild the embedding index for all snippets (required after model changes).")
    .action(async () => {
        if (!(await printOllamaRequired())) return;

        try {
            console.log(chalk.cyan("\n🔄 Reindexing embeddings...\n"));
            const result = await reindexAllSnippets((done, total, title) => {
                process.stdout.write(`\r  ${done}/${total}  ${title.slice(0, 40).padEnd(40)}`);
            });
            process.stdout.write("\n\n");

            if (result.total === 0) {
                console.log(chalk.yellow("No snippets to index.\n"));
                return;
            }
            console.log(result)
            console.log(chalk.green(`✅ Indexed ${result.indexed}/${result.total} snippets`));
            if (result.failed > 0) {
                console.log(chalk.yellow(`⚠ Failed: ${result.failed}`));
            }
            console.log();
        } catch (err) {
            console.log(chalk.red(`✗ Reindex failed: ${err instanceof Error ? err.message : String(err)}\n`));
            process.exitCode = 1;
        }
    });

ai
    .command("choose")
    .description("Interactively choose an embedding model from those installed in Ollama.")
    .action(async () => {
        
        const ollamaUp = await checkOllamaAvailable();
        if (!ollamaUp) {
            console.log(chalk.red(
                "\n❌ Ollama is not reachable. Make sure it is installed and running.\n" +
                "If API-URL is added in config, verify if its correct or not.\n"
            ));
            return;
        }

        const ollamaCfg = readOllamaConfig();
        const client = new Ollama({ host: ollamaCfg?.api || "http://localhost:11434" });

        let models: { name: string; dim: number | null; hasEmbedding: boolean }[] = [];
        try {
            const parsed = await readOllamaModels();
            
            // Try to get embedding dimension for each model via a quick probe
            console.log(chalk.dim("\nFetching model details…"));
            models = await Promise.all(
                parsed.map(async ({ name, hasEmbedding }) => {
                    let dim: number | null = null;
                    if (hasEmbedding && name) {
                        try {
                            const probeRes = await client.embed({ model: name, input: "probe" });
                            const vec = probeRes.embeddings?.[0];
                            dim = vec?.length ?? null;
                        } catch {
                            // model not embedding-capable or too slow — skip
                        }
                    }
                    return { name, dim, hasEmbedding };
                })
            );

            // Filter to only models that responded with a dimension (confirmed embedding)
            const embeddingModels = models.filter((m) => m.dim !== null);

            if (embeddingModels.length === 0) {
                console.log(chalk.yellow(
                    "\n⚠ None of your installed models responded as embedding models.\n" +
                    "  Pull a dedicated embedding model, e.g.:\n" +
                    "  ollama pull <model-name>\n"
                ));
                return;
            }

            console.clear();
            console.log(chalk.cyan("\n🤖 Choose an Embedding Model\n"));

            const current = ollamaCfg?.model?.trim();
            const choices = embeddingModels.map((m) => ({
                name: `${m.name}  ${chalk.dim(`(dim: ${m.dim})`)}${current && current === m.name ? chalk.green("  ← current") : ""}`,
                value: m.name,
            }));
            choices.push({ name: chalk.yellow("Cancel"), value: "__cancel__" });

            const chosen = await select({
                message: "Select an embedding model:",
                choices,
                pageSize: 12,
            });

            if (chosen === "__cancel__") {
                console.log(chalk.dim("No changes made.\n"));
                return;
            }

            setConfigKey("OLLAMA_MODEL", chosen);
            console.log(chalk.green(`\n✅ OLLAMA_MODEL set to ${chalk.bold(chosen)}\n`));

            // 3. Offer to generate embeddings immediately
            const doReindex = await confirm({
                message: "Would you like to generate embeddings now (reindex all snippets)?",
                default: true,
            });

            if (doReindex) {
                if (!(await printOllamaRequired())) return;
                console.log(chalk.cyan("\n🔄 Reindexing embeddings...\n"));
                try {
                    const result = await reindexAllSnippets((done, total, title) => {
                        process.stdout.write(`\r  ${done}/${total}  ${title.slice(0, 40).padEnd(40)}`);
                    });
                    process.stdout.write("\n\n");
                    if (result.total === 0) {
                        console.log(chalk.yellow("No snippets to index.\n"));
                    } else {
                        console.log(chalk.green(`✅ Indexed ${result.indexed}/${result.total} snippets`));
                        if (result.failed > 0) console.log(chalk.yellow(`⚠ Failed: ${result.failed}`));
                        console.log();
                    }
                } catch (err) {
                    console.log(chalk.red(`✗ Reindex failed: ${err instanceof Error ? err.message : String(err)}\n`));
                }
            }

        } catch (err) {
            console.log(chalk.red(`✗ Failed to fetch models: ${err instanceof Error ? err.message : String(err)}\n`));
            process.exitCode = 1;
        }
    });

ai
    .argument("<query>", "Describe the snippet you are looking for")
    .option("-l, --limit <k>", "Max results to return", "10")
    .action(async (query: string, options: { limit: string }) => {
        await runSemanticSearch(query.trim(), options.limit);
    });

export default ai;
