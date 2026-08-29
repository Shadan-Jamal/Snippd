import { Command } from "commander";
import chalk from "chalk";
import {
    checkEditorEnvironment,
    formatEditorSource,
    getEffectiveEditorCommand,
    isEditorExplicitlyConfigured,
} from "../config/editorEnv.ts";
import { CONFIG_FILE, configFileExists } from "../config/snippdConfig.ts";

const doctor = new Command();

doctor
    .name("doctor")
    .description("Check editor environment and Snippd configuration.")
    .action(() => {
        console.log(chalk.cyan("\n🩺 Snippd Doctor\n"));

        console.log(`  ${chalk.bold("Config file:")}     ${chalk.dim(CONFIG_FILE)} ${configFileExists() ? chalk.green("(found)") : chalk.yellow("(missing)")}`);

        const { command, source } = getEffectiveEditorCommand();
        console.log(`  ${chalk.bold("Effective editor:")} ${chalk.green(command)} ${chalk.dim(`(${formatEditorSource(source)})`)}`);

        if (process.env.VISUAL?.trim()) {
            console.log(`  ${chalk.bold("VISUAL:")}          ${process.env.VISUAL}`);
        }
        if (process.env.EDITOR?.trim()) {
            console.log(`  ${chalk.bold("EDITOR:")}          ${process.env.EDITOR}`);
        }
        if (process.env.SNIPPD_EDITOR?.trim()) {
            console.log(`  ${chalk.bold("SNIPPD_EDITOR:")}  ${process.env.SNIPPD_EDITOR}`);
        }

        if (!isEditorExplicitlyConfigured()) {
            console.log(`  ${chalk.bold("Status:")}          ${chalk.yellow("Using platform fallback")}`);
        }

        const result = checkEditorEnvironment();

        if (result.warnings.length > 0) {
            console.log();
            for (const warning of result.warnings) {
                console.log(chalk.yellow(`  ⚠  ${warning}`));
            }
        }

        if (result.errors.length > 0) {
            console.log();
            for (const error of result.errors) {
                console.log(chalk.red(`  ✗  ${error}`));
            }
        }

        console.log();
        if (result.ok && result.warnings.length === 0) {
            console.log(chalk.green("  ✅ Everything looks good.\n"));
        } else if (result.ok) {
            console.log(chalk.yellow("  ⚠  No blocking issues, but review the warnings above.\n"));
            console.log(chalk.dim("  Run `snippd config init` to create ~/.snippd/config.json.\n"));
        } else {
            console.log(chalk.red("  ✗  Issues found. Run `snippd config init` to create ~/.snippd/config.json.\n"));
        }
    });

export default doctor;
