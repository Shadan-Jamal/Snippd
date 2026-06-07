import { Command } from "commander";
import { searchSnippets } from "../db/queries/snippets.ts";
import clipboard from "clipboardy";
import chalk from "chalk";
import { renderChoices } from "../utils/renderChoices.ts";

const search = new Command();

search
    .name("search")
    .description("Search for a snippet.")
    .argument("<title>", "Title to search for")
    .option("-t, --tags <tags...>", "Tags to filter search.")
    .option("-l, --lang <lang>", "Language to filter search.");

const searchAction = async (title: string, options: { tags: string[], lang: string }) => {
    const snippets = searchSnippets(title);

    if (snippets.length === 0) {
        console.log(chalk.yellow(`No snippets found for "${title}".`));
        return;
    }

    const result = await renderChoices(snippets);
    if (result?.action === "copy") {
        await clipboard.write(result.entry.snippet);
        console.log("Copied to Clipboard ✅");
    }
    if (result?.action === "view") {
        console.log("Opening Editor");
    }
}

search.action(searchAction);

export default search;