import { Command } from "commander";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { importDatabase } from "@/db/backup.ts";
import { printOllamaRequired } from "@/src/commands/ai/util.ts";
import { reindexAllSnippets } from "@/src/utils/indexSnippet.ts";

const importCmd = new Command();

importCmd
    .name("import")
    .description("Merge a Snippd backup into the local database (new titles insert; newer updated_at wins).")
    .argument("<file_path>", "Path to a Snippd backup created by `snippd export`")
    .action(async (file: string) => {
        try {
            const result = importDatabase(file);
            console.log(chalk.green(`✅ Merged ${result.source} into ${result.liveDb}`));
            console.log(`  ${chalk.bold("Inserted:")}         ${result.inserted}`);
            console.log(`  ${chalk.bold("Updated:")}          ${result.updated} ${chalk.dim("(newer incoming)")}`);
            console.log(`  ${chalk.bold("Unchanged:")}        ${result.unchanged} ${chalk.dim("(local kept)")}`);
            console.log(`  ${chalk.bold("Tags +:")}           ${result.tagsAdded}`);
            console.log(`  ${chalk.bold("Links +:")}          ${result.linksAdded}`);
            console.log(`  ${chalk.bold("Containers +:")}     ${result.containersAdded}`);
            console.log(`  ${chalk.bold("Container links +:")}  ${result.containerLinksAdded}`);
            console.log();

            const changed = result.inserted + result.updated;
            if (changed === 0) {
                console.log(chalk.dim("No snippet content changed — skipping reindex prompt.\n"));
                return;
            }

            console.log(chalk.yellow("Embedding index was not merged with the backup."));
            const doReindex = await confirm({
                message: "Reindex all snippets now?",
                default: true,
            });

            if (!doReindex) {
                console.log(chalk.dim("Skipped reindex. Run later: snippd ai reindex\n"));
                return;
            }

            if (!(await printOllamaRequired())) {
                console.log(chalk.yellow("\nSkipping reindex — start Ollama, set a model, then run: snippd ai reindex\n"));
                return;
            }

            console.log(chalk.cyan("\n🔄 Reindexing embeddings...\n"));
            try {
                const reindexResult = await reindexAllSnippets((done, total, title) => {
                    process.stdout.write(`\r  ${done}/${total}  ${title.slice(0, 40).padEnd(40)}`);
                });
                process.stdout.write("\n\n");
                if (reindexResult.total === 0) {
                    console.log(chalk.yellow("No snippets to index.\n"));
                } else {
                    console.log(chalk.green(`✅ Indexed ${reindexResult.indexed}/${reindexResult.total} snippets`));
                    if (reindexResult.failed > 0) {
                        console.log(chalk.yellow(`⚠ Failed: ${reindexResult.failed}`));
                    }
                    console.log();
                }
            } catch (err) {
                console.log(chalk.red(`✗ Reindex failed: ${err instanceof Error ? err.message : String(err)}`));
                console.log(chalk.dim("Import succeeded; fix Ollama and run: snippd ai reindex\n"));
                process.exitCode = 1;
            }
        } catch (error) {
            console.log(chalk.red(`✗ Import failed: ${error instanceof Error ? error.message : String(error)}\n`));
            process.exitCode = 1;
        }
    });

export default importCmd;
