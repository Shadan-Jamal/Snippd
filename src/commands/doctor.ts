import { Command } from "commander";
import chalk from "chalk";
import {
    checkEditorConfig,
    getConfiguredEditorCommand,
    CONFIG_FILE,
    configFileExists,
} from "../config/snippdConfig.ts";
import { readOllamaConfig } from "../config/ollamaConfig.ts";
import {
    checkOllamaAvailable,
    ensureConfiguredModelAvailable,
} from "../utils/embeddingUtil.ts";
import {
    countIndexed,
    getEmbeddingMeta,
} from "../../db/queries/embeddings.ts";
import { countSnippets } from "../../db/queries/snippets.ts";

const doctor = new Command();

doctor
    .name("doctor")
    .description("Check Snippd editor, Ollama, and embedding index configuration.")
    .action(async () => {
        console.log(chalk.cyan("🩺 Snippd Doctor"));

        console.log(`  ${chalk.bold("Config file:")}     ${chalk.dim(CONFIG_FILE)} ${configFileExists() ? chalk.green("(found)") : chalk.yellow("(missing)")}`);

        const { command, key } = getConfiguredEditorCommand();
        const role = key === "SNIPPD_VISUAL"
            ? "GUI/interactive"
            : key === "SNIPPD_EDITOR"
                ? "terminal/TUI"
                : "fallback";
        console.log(`  ${chalk.bold("Effective editor:")} ${chalk.green(command)} ${chalk.dim(`(${key ?? "fallback"}; ${role})`)}`);

        if (!key) {
            console.log(`  ${chalk.bold("Status:")}          ${chalk.yellow("Using platform fallback")}`);
        }

        const result = checkEditorConfig();
        if (result.errors.length > 0) {
            console.log();
            for (const error of result.errors) {
                console.log(chalk.red(`  ✗ ${error}`));
            }
        }
        if (result.warnings.length > 0) {
            console.log();
            for (const warning of result.warnings) {
                console.log(chalk.yellow(`  ⚠ ${warning}`));
            }
        }

        console.log();
        console.log(chalk.cyan("AI / embeddings"));

        const ollamaConfig = readOllamaConfig();
        console.log(`  ${chalk.bold("OLLAMA_API:")}      ${ollamaConfig?.api ? chalk.green(ollamaConfig.api) : chalk.yellow("(default http://localhost:11434)")}`);
        console.log(`  ${chalk.bold("OLLAMA_MODEL:")}    ${ollamaConfig?.model?.trim() ? chalk.green(ollamaConfig.model) : chalk.yellow("(not set)")}`);

        const ollamaUp = await checkOllamaAvailable();
        console.log(`  ${chalk.bold("Ollama:")}          ${ollamaUp ? chalk.green("reachable") : chalk.red("unreachable")}`);

        if (ollamaUp && ollamaConfig?.model?.trim()) {
            const modelOk = await ensureConfiguredModelAvailable();
            console.log(`  ${chalk.bold("Embed model:")}     ${modelOk ? chalk.green("available") : chalk.red("missing / not embedding-capable")}`);
        }

        const meta = getEmbeddingMeta();
        const snippets = countSnippets();
        const indexed = countIndexed();
        if (meta) {
            console.log(`  ${chalk.bold("Index model:")}     ${chalk.green(meta.model)} ${chalk.dim(`(dim ${meta.dim})`)}`);
            if (ollamaConfig?.model?.trim() && meta.model !== ollamaConfig.model.trim()) {
                console.log(chalk.yellow(`  ⚠ Config model differs from index — run: snippd ai reindex`));
            }
        } else {
            console.log(`  ${chalk.bold("Index model:")}     ${chalk.yellow("(none — run snippd ai reindex)")}`);
        }
        console.log(`  ${chalk.bold("Indexed:")}         ${indexed}/${snippets} snippets`);

        console.log();
        if (result.errors.length > 0) {
            console.log(chalk.red("  ✗ Configuration needs attention.\n"));
        } else if (result.warnings.length > 0 || !ollamaUp || indexed < snippets) {
            console.log(chalk.yellow("  ⚠ Some checks need attention.\n"));
        } else {
            console.log(chalk.green("  ✅ Ready.\n"));
        }
    });

export default doctor;
