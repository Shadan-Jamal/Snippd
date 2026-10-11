import { Command } from "commander";
import chalk from "chalk";
import { printOllamaRequired, generateEmbedding } from "../utils/embeddingUtil.ts";
import {
    assertIndexCompatibleWithConfig,
    reindexAllSnippets,
} from "../utils/indexSnippet.ts";
import { searchByEmbedding, countIndexed } from "../../db/queries/embeddings.ts";
import { tabulateSnippets, renderSnippetActions } from "../utils/tabulateUtil.ts";

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
    .argument("<query>", "Describe the snippet you are looking for")
    .option("-l, --limit <k>", "Max results to return", "10")
    .action(async (query: string, options: { limit: string }) => {
        await runSemanticSearch(query.trim(), options.limit);
    });

async function runSemanticSearch(query: string, limitRaw: string): Promise<void> {
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

export default ai;
