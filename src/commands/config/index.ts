import { Command } from "commander";
import chalk from "chalk";
import {
    CONFIG_KEYS,
    getConfiguredEditorCommand,
    CONFIG_FILE,
    configFileExists,
    getConfigValuesForDisplay,
    getEditorPathKind,
    getSavedEditors,
    initConfigFile,
    normalizeConfigKey,
    removeSavedEditor,
    setConfigKey,
    setSavedEditor,
    writeConfigFile,
} from "@/src/config/snippdConfig.ts";
import { confirm, input, select } from "@inquirer/prompts";
import { checkModelConfigured } from "./util.ts";

const config = new Command();

config
    .name("config")
    .description("Manage Snippd configuration.");

config
    .command("show")
    .description("Show current configuration.")
    .action(() => {
        const { command, key } = getConfiguredEditorCommand();

        console.log(chalk.cyan("\n📋 Snippd Configuration\n"));
        console.log(`  ${chalk.bold("Config file:")}     ${chalk.dim(CONFIG_FILE)} ${configFileExists() ? "" : chalk.yellow("(missing)")}`);
        console.log(`  ${chalk.bold("Effective editor:")} ${chalk.green(command)} ${chalk.dim(`(${key ?? "fallback"})`)}`);

        const fileConfig = getConfigValuesForDisplay();
        if (Object.keys(fileConfig).length > 0) {
            console.log();
            console.log(chalk.bold("  From config.json:"));
            console.log(chalk.dim(JSON.stringify(fileConfig, null, 2).split("\n").map(l => `    ${l}`).join("\n")));
        }

        if (!key) {
            console.log();
            console.log(`  ${chalk.bold("Editor status:")}    ${chalk.yellow("Using platform fallback")}`);
        }

        console.log();
    });

config
    .command("init")
    .description("Create ~/.snippd/config.json with a default template.")
    .action(() => {
        if (initConfigFile()) {
            console.log(chalk.green(`✅ Created ${CONFIG_FILE}`));
            console.log(chalk.dim('Run `snippd config set SNIPPD_VISUAL "..."` for a GUI editor or `SNIPPD_EDITOR "..."` for a TUI editor.\n'));
        } else {
            console.log(chalk.yellow(`Config file already exists: ${CONFIG_FILE}\n`));
        }
    });

config
    .command("set")
    .description('Set a config value (e.g. set snippd_visual "C:\\path\\to\\Code.exe\\ --wait").')
    .argument("<key>", "snippd_editor, snippd_visual, ollama_api_url, ollama_model")
    .argument("<value>", "Editor command")
    .action(async (key: string, value: string) => {
        const configKey = normalizeConfigKey(key);
        if (!configKey) {
            console.log(chalk.red(`Unknown key "${key}". Use any from ${Object.keys(CONFIG_KEYS).join(", ")}.\n`));
            return;
        }

        setConfigKey(configKey, value);
        const exists = await checkModelConfigured(value.trim());
        if (configKey === "OLLAMA_MODEL" && !exists) {
            console.log(chalk.yellow(`⚠ Model "${value}" is either invalid or not installed. Make sure the entered <model-name> is correct or run 'snippd ai choose' to choose from installed models.\n`));
            return;
        }
        console.log(chalk.green(`✅ Updated ${CONFIG_FILE}`));
        console.log(chalk.dim(`   ${configKey}: ${value}\n`));

        if (configKey === "OLLAMA_MODEL") {
            const doReindex = await confirm({
                message: "Would you like to generate embeddings now (reindex all snippets)?",
                default: true,
            });
            if (doReindex) {
                const { reindexAllSnippets } = await import("@/src/utils/indexSnippet.ts");
                const { printOllamaRequired } = await import("../ai/util.ts");
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
        }
    });

config
    .command("reset")
    .description("Clear all configuration values, resetting config.json to empty defaults.")
    .action(async () => {
        const doReset = await confirm({
            message: "Are you sure you want to reset all config values? This cannot be undone.",
            default: false,
        });
        if (!doReset) {
            console.log(chalk.dim("Reset cancelled.\n"));
            return;
        }
        writeConfigFile({
            SNIPPD_VISUAL: "",
            SNIPPD_EDITOR: "",
            OLLAMA_API_URL: "",
            OLLAMA_MODEL: "",
            EDITORS: {},
        });
        console.log(chalk.green(`✅ Config reset — all values cleared in ${CONFIG_FILE}\n`));
    });

config
    .command("editor")
    .description("List and manage saved editor paths (aliases) in config.json.")
    .action(async () => {
        const printEditors = () => {
            const editors = getSavedEditors();
            const aliases = Object.keys(editors).sort((a, b) => a.localeCompare(b));

            console.log(chalk.cyan("\n📝 Saved editors\n"));
            if (aliases.length === 0) {
                console.log(chalk.yellow("  No editors saved yet."));
                console.log(chalk.dim('  Use "Add editor path" to save an alias + path.\n'));
                return editors;
            }

            for (const alias of aliases) {
                const command = editors[alias]!;
                console.log(`  ${chalk.green(alias)}  ${chalk.dim(getEditorPathKind(command))}`);
                console.log(`    ${chalk.dim(command)}`);
            }
            console.log();
            return editors;
        };

        let editors = printEditors();

        const action = await select({
            message: chalk.bold("Editor options:"),
            choices: [
                { name: "Add editor path", value: "add" },
                { name: "Use a saved editor (set active)", value: "use", disabled: Object.keys(editors).length === 0 },
                { name: "Remove a saved editor", value: "remove", disabled: Object.keys(editors).length === 0 },
                { name: chalk.dim("  Done"), value: "done" },
            ],
        });

        if (action === "done") return;

        if (action === "add") {
            const alias = (await input({
                message: "Alias for this editor (e.g. vscode, cursor, nvim):",
                validate: (v) => (v.trim() ? true : "Alias is required"),
            })).trim();

            const editorPath = (await input({
                message: "Editor path or command (e.g. C:\\...\\Code.exe or nvim):",
                validate: (v) => (v.trim() ? true : "Path is required"),
            })).trim();

            try {
                setSavedEditor(alias, editorPath);
                const saved = getSavedEditors()[alias] ?? editorPath;
                console.log(chalk.green(`\n✅ Saved editor "${alias}"`));
                console.log(`  ${chalk.green(alias)}  ${chalk.dim(getEditorPathKind(saved))}`);
                console.log(`    ${chalk.dim(saved)}\n`);
            } catch (err) {
                console.log(chalk.red(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`));
            }
            return;
        }

        editors = getSavedEditors();
        const aliases = Object.keys(editors).sort((a, b) => a.localeCompare(b));
        if (aliases.length === 0) {
            console.log(chalk.yellow("\nNo saved editors.\n"));
            return;
        }

        const chosenAlias = await select({
            message: action === "use" ? "Choose editor to activate:" : "Choose editor to remove:",
            choices: aliases.map((alias) => ({
                name: `${alias}  ${chalk.dim(getEditorPathKind(editors[alias]!))}`,
                value: alias,
            })),
        });

        if (action === "remove") {
            removeSavedEditor(chosenAlias);
            console.log(chalk.green(`\n✅ Removed editor "${chosenAlias}"\n`));
            return;
        }

        const targetKey = await select({
            message: "Set as:",
            choices: [
                { name: "SNIPPD_VISUAL (GUI / interactive)", value: "SNIPPD_VISUAL" as const },
                { name: "SNIPPD_EDITOR (terminal / TUI)", value: "SNIPPD_EDITOR" as const },
            ],
        });

        const command = editors[chosenAlias]!;
        setConfigKey(targetKey, command);
        console.log(chalk.green(`\n✅ ${targetKey} ← ${chosenAlias}`));
        console.log(`  ${chalk.green(chosenAlias)}  ${chalk.dim(getEditorPathKind(command))}`);
        console.log(`    ${chalk.dim(command)}\n`);
    });

config
    .command("setup")
    .description("Show editor setup instructions.")
    .action(() => {
        console.log(chalk.cyan("\n📝 Editor setup\n"));
        console.log("Snippd reads editor settings only from ~/.snippd/config.json.");
        console.log("SNIPPD_VISUAL is for GUI or interactive editors; SNIPPD_EDITOR is for terminal/TUI editors.\n");
        console.log(chalk.green('  snippd config editor'));
        console.log(chalk.dim("    Save aliased editor paths, then activate one as SNIPPD_VISUAL / SNIPPD_EDITOR.\n"));
        console.log(chalk.green('  snippd config set SNIPPD_VISUAL "\\"C:\\\\path\\\\Code.exe\\" --wait"'));
        console.log(chalk.green('  snippd config set SNIPPD_EDITOR "nvim"\n'));
    });

export default config;
