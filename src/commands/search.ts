import { Command } from "commander";
import { searchSnippets } from "../../db/queries/snippets.ts";
import chalk from "chalk";
import { tabulateSnippets, renderActions } from "../utils/tabulateSnippets.ts";

const search = new Command();

search
    .name("search")
    .description("Full-text search across snippet titles, code, and extension.")
    .argument("<query>", "Text to search for.");

const searchAction = async (query: string) => {
    const snippets = searchSnippets(query);

    if (snippets.length === 0) {
        console.log(chalk.yellow(`No snippets found for "${query}".`));
        return;
    }

    const selections = tabulateSnippets(snippets);
    if (!selections) return;
    await renderActions(selections, snippets);
}

search.action(searchAction);

export default search;