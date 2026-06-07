import { Command } from "commander";
import { searchSnippets } from "../db/queries/snippets.ts";
import clipboard from "clipboardy";
import chalk from "chalk";
import { choices } from "../utils/choices.ts";

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

    await choices(snippets);
}

search.action(searchAction);

export default search;