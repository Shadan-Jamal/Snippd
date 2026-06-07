import { Command } from "commander";
import { getAllSnippets, getFilteredSnippets } from "../db/queries/snippets.ts";
import { choices } from "../utils/choices.ts";
import chalk from "chalk";

const list = new Command();

list
    .name("list")
    .description("List all snippets.")
    .option("-l, --lang <lang>", "Filter by language")
    .option("-t, --tags <tags...>", "Filter by one or more tags");

const listAction = async (options: { lang?: string; tags?: string[] }) => {
    const hasFilter = options.lang || (options.tags && options.tags.length > 0);

    const snippets = hasFilter
        ? getFilteredSnippets({ lang: options.lang, tags: options.tags })
        : getAllSnippets();

    if (snippets.length === 0) {
        const parts: string[] = [];
        if (options.lang) parts.push(`language "${options.lang}"`);
        if (options.tags?.length) parts.push(`tag(s): ${options.tags.join(", ")}`);
        const filterDesc = parts.length ? ` for ${parts.join(" and ")}` : "";
        console.log(chalk.yellow(`No snippets found${filterDesc}.`));
        return;
    }

    await choices(snippets);
}

list.action(listAction);

export default list;
