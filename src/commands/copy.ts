import { Command } from "commander";
import { select } from "@inquirer/prompts";
import clipboard from "clipboardy";
import chalk from "chalk";
import { getAllSnippets, getSnippetByIdentifier } from "../../db/queries/snippets.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";
import { tabulateSnippets } from "../utils/tabulateUtil.ts";

const copy = new Command();

copy
    .name("copy")
    .description("Copy a snippet to the clipboard.")
    .argument("[title]", "Optional snippet title. If omitted, an interactive picker will appear.");

const copyAction = async (title?: string) => {
    let snippet: { title: string; snippet: string } | undefined;

    if (title) {
        const { cleanTitle } = extractExtensionFromTitle(title);
        snippet = getSnippetByIdentifier(cleanTitle) ?? getSnippetByIdentifier(title) ?? undefined;
    } else {
        const snippets = getAllSnippets();
        if (!snippets.length) {
            console.log(chalk.yellow("No snippets available to copy."));
            return;
        }

        const selected = await select({
            message: "Select a snippet to copy",
            choices: tabulateSnippets(snippets),
            pageSize: 10,
            theme: { prefix: "" },
        });
        snippet = selected;
    }

    if (!snippet) {
        console.log(chalk.red(`Snippet not found: "${title ?? "selected item"}".`));
        return;
    }

    try {
        await clipboard.write(snippet.snippet);
        console.log(chalk.green(`Copied "${snippet.title}" to the clipboard ✅`));
    } catch {
        console.log(chalk.red(`Failed to copy "${snippet.title}".`));
    }
};

copy.action(copyAction);

export default copy;
