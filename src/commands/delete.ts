import { Command } from "commander";
import { deleteSnippet } from "../../db/queries/snippets.ts";
import { getAllSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets } from "../utils/tabulateUtil.ts";
import chalk from "chalk";
import { searchSnippets } from "../../db/queries/snippets.ts";
import { select, confirm } from "@inquirer/prompts";
import type { SnippetWithTags } from "../types/index.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";

const deleteCmd = new Command();

deleteCmd
    .name("delete")
    .description("Delete a snippet by title. If no title is provided, it will show all the snippets.")
    .argument("[title]", "Title of the snippet to delete.");

const deleteCmdAction = async (identifier: any) => {
    if(!identifier){
        await interactiveDelete();
        return;
    }

    // Extract extension from title if present
    const { cleanTitle } = extractExtensionFromTitle(identifier);

    const result = deleteSnippet(cleanTitle);
    if (!result) {
        console.log(chalk.red(`Could not delete snippet.`));
        console.log(chalk.bgYellowBright(`Showing all the snippets for "${cleanTitle}"`))
        const results = searchSnippets(cleanTitle);
        tabulateSnippets(results);
        console.log();
        return;
    }
    console.log(chalk.green(`Successfully deleted snippet: ${cleanTitle}`));
}

async function interactiveDelete(): Promise<void> {
    const snippets = getAllSnippets();

    if (snippets.length === 0) {
        console.log(chalk.yellow("No snippets found."));
        return;
    }

    console.log(chalk.cyan("\n🗑️  Delete Snippet\n"));

    while (true) {
        const selections = tabulateSnippets(snippets);
        if (!selections) return;

        const choices: ({ name: string; value: SnippetWithTags | string })[] = [
            ...selections,
            { name: chalk.red("Cancel"), value: "__cancel__" },
        ];

        const selected = await select({
            message: "Select a snippet to delete:",
            choices,
            pageSize: 10,
            theme: { prefix: "" },
        });

        if (selected === "__cancel__") {
            console.log(chalk.yellow("Cancelled."));
            return;
        }

        const confirmed = await confirm({
            message: `Are you sure you want to delete "${(selected as SnippetWithTags).title}"?`,
            default: false,
        });

        if (confirmed) {
            const deleted = deleteSnippet((selected as SnippetWithTags).title);
            if (deleted) {
                console.log(chalk.green(`Successfully deleted snippet: ${(selected as SnippetWithTags).title}`));
                // Refresh the list
                const remainingSnippets = getAllSnippets();
                if (remainingSnippets.length === 0) {
                    console.log(chalk.yellow("No more snippets."));
                    return;
                }
                // Update snippets array for next iteration
                snippets.length = 0;
                snippets.push(...remainingSnippets);
            } else {
                console.log(chalk.red("Failed to delete snippet."));
            }
        } else {
            console.log(chalk.yellow("Deletion cancelled."));
        }
        console.log();

        // Ask if user wants to delete another
        const continueDeleting = await confirm({
            message: "Delete another snippet?",
            default: true,
        });

        if (!continueDeleting) {
            return;
        }
    }
}

deleteCmd.action(deleteCmdAction);

export default deleteCmd;