import { Command } from "commander";
import chalk from "chalk";
import { getConfig, resetConfig, CONFIG_FILE } from "../config/index.ts";
import { runSetup } from "../config/setup.ts";

const config = new Command();

config
    .name("config")
    .description("Manage Snippd configuration.");

config
    .command("show")
    .description("Show current configuration.")
    .action(() => {
        const cfg = getConfig();
        if (!cfg) {
            console.log(chalk.yellow("No configuration found. Run any command to trigger setup."));
            return;
        }

        console.log(chalk.cyan("\n📋 Snippd Configuration\n"));
        console.log(`  ${chalk.bold("Config file:")}  ${chalk.dim(CONFIG_FILE)}`);
        console.log(`  ${chalk.bold("Editor:")}       ${cfg.editor.name} (${chalk.green(cfg.editor.command)})`);
        console.log(`  ${chalk.bold("Resolved to:")} ${chalk.dim(cfg.editor.resolvedCommand)}`);
        if (cfg.editor.args?.length) {
            console.log(`  ${chalk.bold("Args:")}         ${cfg.editor.args.join(" ")}`);
        }
        if (cfg.editor.readOnlyArgs?.length) {
            console.log(`  ${chalk.bold("View args:")}    ${cfg.editor.readOnlyArgs.join(" ")}`);
        }
        console.log();
    });

config
    .command("editor")
    .description("Change the configured editor.")
    .action(async () => {
        await runSetup();
    });

config
    .command("reset")
    .description("Reset configuration. Next command will trigger setup.")
    .action(() => {
        const deleted = resetConfig();
        if (deleted) {
            console.log(chalk.green("✅ Configuration reset. Run any command to reconfigure."));
        } else {
            console.log(chalk.yellow("No configuration file found."));
        }
    });

export default config;
