import { program } from "commander";
import chalk from "chalk";
import { input } from "@inquirer/prompts";

export const recentInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\n⏱  Recent Snippets\n"));

    const limitRaw = await input({
        message: "How many snippets to show?",
        default: "10",
    });

    const searchQuery = await input({
        message: "Filter by keyword (optional, press Enter to skip):",
        default: "",
    });

    const args = [...parseAsyncArgs, "recent", "--limit", limitRaw.trim() || "10"];
    if (searchQuery.trim()) args.push("--search", searchQuery.trim());
    await program.parseAsync(args);
};
