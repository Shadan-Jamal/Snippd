import { Command } from "commander";
import chalk from "chalk";
import { importDatabase } from "../../db/backup.ts";

const importCmd = new Command();

importCmd
    .name("import")
    .description("Merge a Snippd backup into the local database (new titles insert; newer updated_at wins).")
    .argument("<file>", "Path to a Snippd backup created by `snippd export`")
    .action((file: string) => {
        try {
            const result = importDatabase(file);
            console.log(chalk.green(`✅ Merged ${result.source} into ${result.liveDb}`));
            console.log(`  ${chalk.bold("Inserted:")}  ${result.inserted}`);
            console.log(`  ${chalk.bold("Updated:")}   ${result.updated} ${chalk.dim("(newer incoming)")}`);
            console.log(`  ${chalk.bold("Unchanged:")} ${result.unchanged} ${chalk.dim("(local kept)")}`);
            console.log(`  ${chalk.bold("Tags +:")}    ${result.tagsAdded}`);
            console.log(`  ${chalk.bold("Links +:")}   ${result.linksAdded}`);
            console.log();
        } catch (error) {
            console.log(chalk.red(`✗ Import failed: ${error instanceof Error ? error.message : String(error)}\n`));
            process.exitCode = 1;
        }
    });

export default importCmd;
