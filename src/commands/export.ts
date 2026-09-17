import { Command } from "commander";
import chalk from "chalk";
import { defaultExportPath, exportDatabase } from "../../db/backup.ts";

const exportCmd = new Command();

exportCmd
    .name("export")
    .description("Backup the Snippd database to a portable .db file.")
    .argument("[file]", "Destination path (defaults to ~/.snippd/snippd-backup-YYYY-MM-DD.db)")
    .action(async (file?: string) => {
        try {
            const dest = await exportDatabase(file ?? defaultExportPath());
            console.log(chalk.green(`✅ Exported database to ${dest}`));
            console.log(chalk.dim("Copy this file to another device, then run: snippd import <file>\n"));
        } catch (error) {
            console.log(chalk.red(`✗ Export failed: ${error instanceof Error ? error.message : String(error)}\n`));
            process.exitCode = 1;
        }
    });

export default exportCmd;
