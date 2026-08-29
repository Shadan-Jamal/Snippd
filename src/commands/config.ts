import { Command } from "commander";
import chalk from "chalk";
import {
    getEffectiveEditorCommand,
    getWindowsEditorPathTip,
    formatEditorSource,
    isEditorExplicitlyConfigured,
    printEditorSetupInstructions,
    usesWindowsShorthand,
} from "../config/editorEnv.ts";
import {
    CONFIG_FILE,
    configAppliedKeys,
    configFileExists,
    getConfigFieldsForDisplay,
    initConfigFile,
    normalizeConfigField,
    readConfigFile,
    setConfigField,
} from "../config/snippdConfig.ts";

const config = new Command();

config
    .name("config")
    .description("Manage Snippd configuration.");

config
    .command("show")
    .description("Show current configuration.")
    .action(() => {
        const { command, source } = getEffectiveEditorCommand();

        console.log(chalk.cyan("\n📋 Snippd Configuration\n"));
        console.log(`  ${chalk.bold("Config file:")}     ${chalk.dim(CONFIG_FILE)} ${configFileExists() ? "" : chalk.yellow("(missing)")}`);
        console.log(`  ${chalk.bold("Effective editor:")} ${chalk.green(command)} ${chalk.dim(`(${formatEditorSource(source)})`)}`);

        const fileConfig = getConfigFieldsForDisplay();
        if (Object.keys(fileConfig).length > 0) {
            console.log();
            console.log(chalk.bold("  From config.json:"));
            console.log(chalk.dim(JSON.stringify(fileConfig, null, 2).split("\n").map(l => `    ${l}`).join("\n")));
        }

        const shellKeys = ["VISUAL", "EDITOR", "SNIPPD_EDITOR"] as const;
        const shellOverrides = shellKeys.filter(
            (key) => process.env[key]?.trim() && !configAppliedKeys.has(key),
        );

        if (shellOverrides.length > 0) {
            console.log();
            console.log(chalk.bold("  From shell (session):"));
            for (const key of shellOverrides) {
                console.log(`    ${key}=${process.env[key]}`);
            }
        }

        if (!isEditorExplicitlyConfigured()) {
            console.log();
            console.log(`  ${chalk.bold("Editor status:")}    ${chalk.yellow("Using platform fallback")}`);
        }

        if (usesWindowsShorthand(command)) {
            console.log();
            console.log(chalk.yellow(`  ⚠  ${getWindowsEditorPathTip()}`));
        }

        console.log();
    });

config
    .command("init")
    .description("Create ~/.snippd/config.json with a default template.")
    .action(() => {
        if (initConfigFile()) {
            console.log(chalk.green(`✅ Created ${CONFIG_FILE}`));
            console.log(chalk.dim('Run `snippd config set visual "..."` to configure your editor.\n'));
        } else {
            console.log(chalk.yellow(`Config file already exists: ${CONFIG_FILE}\n`));
        }
    });

config
    .command("set")
    .description('Set a config value (e.g. set visual "\\"C:\\\\path\\\\code.exe\\" --wait").')
    .argument("<key>", "visual, editor, or snippd")
    .argument("<value>", "Editor command")
    .action((key: string, value: string) => {
        const field = normalizeConfigField(key);
        if (!field) {
            console.log(chalk.red(`Unknown key "${key}". Use visual, editor, or snippd.\n`));
            return;
        }

        setConfigField(field, value);
        console.log(chalk.green(`✅ Updated ${CONFIG_FILE}`));
        console.log(chalk.dim(`   ${field}: ${value}\n`));
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
        printEditorSetupInstructions();
    });

export default config;
