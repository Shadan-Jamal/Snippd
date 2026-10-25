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
import type { EditorConfigKey } from "@/src/types/index.ts";
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
        const currentEditor = getConfigValuesForDisplay().CURRENT_EDITOR;

        console.log(chalk.cyan("\n📋 Snippd Configuration\n"));
        console.log(`  ${chalk.bold("Config file:")}     ${chalk.dim(CONFIG_FILE)} ${configFileExists() ? "" : chalk.yellow("(missing)")}`);
        console.log(`  ${chalk.bold("Current editor:")}  ${chalk.green(currentEditor === "SNIPPD_GUI" ? "GUI" : "TUI")} ${chalk.dim(`(${currentEditor})`)}`);
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
            console.log(chalk.dim('Adding your first SNIPPD_GUI or SNIPPD_TUI path selects that mode. You can change it later with CURRENT_EDITOR.\n'));
        } else {
            console.log(chalk.yellow(`Config file already exists: ${CONFIG_FILE}\n`));
        }
    });

config
    .command("set")
    .description('Set a config value (e.g. set snippd_gui "C:\\path\\to\\Code.exe\\ --wait").')
    .argument("<key>", "snippd_gui, snippd_tui, current_editor, ollama_api_url, ollama_model")
    .argument("<value>", "Value to set")
    .action(async (key: string, value: string) => {
        const configKey = normalizeConfigKey(key);
        if (!configKey) {
            console.log(chalk.red(`Unknown key "${key}". Use any from ${Object.keys(CONFIG_KEYS).join(", ")}.\n`));
            return;
        }

        setConfigKey(configKey, value);
        if (configKey === "OLLAMA_MODEL") {
            const exists = await checkModelConfigured(value.trim());
            if (!exists) {
                console.log(chalk.yellow(`⚠ Model "${value}" is either invalid or not installed. Make sure the entered <model-name> is correct or run 'snippd ai choose' to choose from installed models.\n`));
                return;
            }
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
            SNIPPD_GUI: "",
            SNIPPD_TUI: "",
            CURRENT_EDITOR: "",
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
            if (aliases.length === 0) {
                console.log(chalk.yellow("  No editors saved yet."));
                console.log(chalk.dim('  Use "Add editor path" to save an alias + path.\n'));
                return editors;
            }

            return editors;
        };

        while (true) {
            const editors = printEditors();
            const action = await select({
                message: chalk.bold("Editor options:"),
                choices: [
                    { name: "Add editor path", value: "add" },
                    { name: "Set current editor (GUI/TUI)", value: "current" },
                    { name: "Use a saved editor (set active)", value: "use", disabled: Object.keys(editors).length === 0 },
                    { name: "Remove a saved editor", value: "remove", disabled: Object.keys(editors).length === 0 },
                    { name: chalk.yellow("  Go back"), value: "back" },
                ],
            });

            if (action === "back") return;

            if (action === "add") {
                const alias = (await input({
                    message: "Alias for this editor (e.g. vscode, cursor, nvim):",
                    validate: (v) => (v.trim() ? true : "Alias is required"),
                })).trim();

                const editorPath = (await input({
                    message: "Editor path or command (e.g. C:\\...\\Code.exe or nvim):",
                    validate: (v) => (v.trim() ? true : "Path is required"),
                })).trim();
                const targetKey = await select<EditorConfigKey>({
                    message: "Add this editor as:",
                    choices: [
                        { name: "SNIPPD_GUI (GUI / interactive)", value: "SNIPPD_GUI" },
                        { name: "SNIPPD_TUI (terminal / TUI)", value: "SNIPPD_TUI" },
                    ],
                });

                try {
                    setSavedEditor(alias, editorPath, targetKey);
                    setConfigKey(targetKey, editorPath);
                    const saved = getSavedEditors()[alias] ?? editorPath;
                    console.log(chalk.green(`\n✅ Saved editor "${alias}"`));
                    console.log(`  ${chalk.green(alias)}  ${chalk.dim(getEditorPathKind(saved))}`);
                    console.log(`    ${chalk.dim(saved)}`);
                    const currentEditor = getConfigValuesForDisplay().CURRENT_EDITOR;
                    console.log(chalk.dim(
                        currentEditor === targetKey
                            ? `    ${targetKey} is the current editor mode.\n`
                            : `    Current editor mode remains ${currentEditor}.\n`,
                    ));
                } catch (err) {
                    console.log(chalk.red(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`));
                }
                continue;
            }

            if (action === "current") {
                const currentEditor = await select<EditorConfigKey>({
                    message: "Choose the current editor:",
                    choices: [
                        { name: "GUI editor (SNIPPD_GUI)", value: "SNIPPD_GUI" },
                        { name: "TUI editor (SNIPPD_TUI)", value: "SNIPPD_TUI" },
                    ],
                });
                setConfigKey("CURRENT_EDITOR", currentEditor);
                console.log(chalk.green(`\n✅ Current editor set to ${currentEditor === "SNIPPD_GUI" ? "GUI" : "TUI"} (${currentEditor})\n`));
                continue;
            }

            let returnToEditorOptions = false;
            while (!returnToEditorOptions) {
                const currentEditors = getSavedEditors();
                const aliases = Object.keys(currentEditors).sort((a, b) => a.localeCompare(b));
                const chosen = await select<{ type: "back" } | { type: "alias"; alias: string }>({
                    message: action === "use" ? "Choose editor to activate:" : "Choose editor to remove:",
                    choices: [
                        ...aliases.map((alias) => ({
                            name: `${alias}  ${chalk.dim(getEditorPathKind(currentEditors[alias]!))}`,
                            value: { type: "alias" as const, alias },
                        })),
                        { name: chalk.yellow("  Go back to editor options"), value: { type: "back" as const } },
                    ],
                });

                if (chosen.type === "back") {
                    returnToEditorOptions = true;
                    continue;
                }

                if (action === "remove") {
                    removeSavedEditor(chosen.alias);
                    console.log(chalk.green(`\n✅ Removed editor "${chosen.alias}"\n`));
                    returnToEditorOptions = true;
                    continue;
                }

                const targetKey = await select<EditorConfigKey | "back">({
                    message: "Set as:",
                    choices: [
                        { name: "SNIPPD_GUI (GUI / interactive)", value: "SNIPPD_GUI" },
                        { name: "SNIPPD_TUI (terminal / TUI)", value: "SNIPPD_TUI" },
                        { name: chalk.yellow("  Go back to editor selection"), value: "back" },
                    ],
                });
                if (targetKey === "back") continue;

                const command = currentEditors[chosen.alias]!;
                setConfigKey(targetKey, command);
                setConfigKey("CURRENT_EDITOR", targetKey);
                console.log(chalk.green(`\n✅ ${targetKey} ← ${chosen.alias}`));
                console.log(`  ${chalk.green(chosen.alias)}  ${chalk.dim(getEditorPathKind(command))}`);
                console.log(`    ${chalk.dim(command)}\n`);
                returnToEditorOptions = true;
            }
        }
    });

config
    .command("setup")
    .description("Show editor and Ollama setup instructions.")
    .action(() => {
        console.log(chalk.cyan("\n📝 Editor setup\n"));
        console.log(chalk.bold("Snippd reads editor settings only from ~/.snippd/config.json."));
        console.log(chalk.cyan("I. SNIPPD_GUI is for GUI or interactive editors; SNIPPD_TUI is for terminal/TUI editors."));
        console.log("Your first editor path selects the active mode; change it later with CURRENT_EDITOR.\n");
        console.log(chalk.green('  snippd config set SNIPPD_GUI "\\"C:\\\\path\\\\Code.exe\\" --wait"'));
        console.log(chalk.green('  snippd config set SNIPPD_TUI "nvim"'));
        console.log(chalk.green('  snippd config set CURRENT_EDITOR SNIPPD_TUI\n'));

        console.log(chalk.cyan("II. Ollama setup (for semantic search)\n"));
        console.log("Install Ollama from https://ollama.com/download and make sure its server is running.");
        console.log("The default Ollama URL is http://localhost:11434; set OLLAMA_API_URL only if you've changed it.\n");
        console.log(chalk.green('  snippd config set OLLAMA_API_URL "<api_url>"'));
        console.log(chalk.green("  ollama pull <model_name>"));
        console.log(chalk.green("  snippd config set OLLAMA_MODEL <model_name>"));
        console.log(chalk.dim("Alternatively, run `snippd ai choose` to select an installed embedding model."));
        console.log(chalk.dim("After setup, run `snippd ai reindex` to generate embeddings for existing snippets.\n"));
    });

export default config;
