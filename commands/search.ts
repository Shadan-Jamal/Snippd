import { Command } from "commander";
import { searchSnippets } from "../db/queries/snippets.ts";
import clipboard from "clipboardy";
import chalk from "chalk";
import { renderChoices } from "../utils/renderChoices.ts";

const search = new Command();

search
    .name("search")
    .description("Full-text search across snippet titles, code, and language.")
    .argument("<query>", "Text to search for");

const searchAction = async (query: string) => {
    const snippets = searchSnippets(query);

    if (snippets.length === 0) {
        console.log(chalk.yellow(`No snippets found for "${query}".`));
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