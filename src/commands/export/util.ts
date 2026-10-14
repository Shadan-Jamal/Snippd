import { program } from "commander";
import chalk from "chalk";
import { input } from "@inquirer/prompts";

export const exportInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\nExport Snippets\n"));

    const filePath = await input({
        message: "Destination path (leave blank for default ~/.snippd/snippd-backup-<date>.db):",
        default: "",
    });

    const args = [...parseAsyncArgs, "export"];
    if (filePath.trim()) args.push(filePath.trim());
    await program.parseAsync(args);
};
