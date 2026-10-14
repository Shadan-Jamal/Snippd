import { program } from "commander";
import chalk from "chalk";
import { input } from "@inquirer/prompts";

export const importInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\n↑  Import Snippets\n"));

    const filePath = await input({
        message: "Path to the .db backup file:",
        validate: (v) => v.trim().length > 0 || "File path cannot be empty.",
    });

    await program.parseAsync([...parseAsyncArgs, "import", filePath.trim()]);
};
