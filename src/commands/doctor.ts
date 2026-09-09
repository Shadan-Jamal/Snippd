import { Command } from "commander";
import chalk from "chalk";
import {
    checkEditorConfig,
    getConfiguredEditorCommand,
    CONFIG_FILE,
    configFileExists,
} from "../config/snippdConfig.ts";

const doctor = new Command();

doctor
    .name("doctor")
    .description("Check Snippd JSON editor configuration.")
    .action(() => {
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
        if (result.errors.length > 0) {
            console.log(chalk.red("  ✗ Configuration needs attention.\n"));
        } else if (result.warnings.length > 0) {
            console.log(chalk.yellow("  ⚠ Configuration loaded with warnings.\n"));
        } else {
            console.log(chalk.green("  ✅ JSON configuration loaded.\n"));
        }
    });

export default doctor;
