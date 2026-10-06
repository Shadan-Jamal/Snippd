import { Command } from "commander";
import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { getAllSnippets, getSnippetByIdentifier } from "../../db/queries/snippets.ts";
import { openEditorForView } from "../utils/editor.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";
import { tabulateSnippets } from "../utils/tabulateUtil.ts";

const view = new Command();

view
    .name("view")
    .description("Open a snippet in the configured editor.")
    .argument("[title]", "Optional snippet title. If omitted, an interactive picker will appear.");

const viewAction = async (title?: string) => {
    let snippet: { title: string; snippet: string; extension?: string } | undefined;

    if (title) {
        const { cleanTitle } = extractExtensionFromTitle(title);
        snippet = getSnippetByIdentifier(cleanTitle) ?? getSnippetByIdentifier(title) ?? undefined;
    } else {
        const snippets = getAllSnippets();
        if (!snippets.length) {
            console.log(chalk.yellow("No snippets available to view."));
            return;
        }

        const selected = await select({
            message: "Select a snippet to view",
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

    await openEditorForView(snippet.snippet, snippet.extension);
    console.log(chalk.green(`Opened "${snippet.title}" in the editor ✅`));
};

view.action(viewAction);

export default view;
