import { Command } from "commander";
import chalk from "chalk";
import {
    getConfiguredEditorCommand,
} from "../config/snippdConfig.ts";
import {
    CONFIG_FILE,
    configFileExists,
    getConfigValuesForDisplay,
    initConfigFile,
    normalizeConfigKey,
    readConfigFile,
    setConfigKey,
} from "../config/snippdConfig.ts";

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
    .description('Set a config value (e.g. set SNIPPD_VISUAL "\\"C:\\\\path\\\\Code.exe\\" --wait").')
    .argument("<key>", "SNIPPD_VISUAL or SNIPPD_EDITOR")
    .argument("<value>", "Editor command")
    .action((key: string, value: string) => {
        const configKey = normalizeConfigKey(key);
        if (!configKey) {
            console.log(chalk.red(`Unknown key "${key}". Use SNIPPD_VISUAL or SNIPPD_EDITOR.\n`));
            return;
        }

        setConfigKey(configKey, value);
        console.log(chalk.green(`✅ Updated ${CONFIG_FILE}`));
        console.log(chalk.dim(`   ${configKey}: ${value}\n`));
    });

config
    .command("path")
    .description("Print the config file path and contents.")
    .action(() => {
        console.log(chalk.cyan("\n📄 Snippd config\n"));
        console.log(`  ${chalk.bold("Path:")} ${CONFIG_FILE}\n`);

        if (!configFileExists()) {
            console.log(chalk.yellow("  File not found. Run `snippd config init` to create it.\n"));
            return;
        }

        console.log(JSON.stringify(readConfigFile(), null, 2));
        console.log();
    });

config
    .command("setup")
    .description("Show editor setup instructions.")
    .action(() => {
        console.log(chalk.cyan("\n📝 Editor setup\n"));
        console.log("Snippd reads editor settings only from ~/.snippd/config.json.");
        console.log("SNIPPD_VISUAL is for GUI or interactive editors; SNIPPD_EDITOR is for terminal/TUI editors.\n");
        console.log(chalk.green('  snippd config set SNIPPD_VISUAL "\\"C:\\\\path\\\\Code.exe\\" --wait"'));
        console.log(chalk.green('  snippd config set SNIPPD_EDITOR "nvim"\n'));
    });

export default config;
