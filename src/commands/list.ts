import { Command } from "commander";
import { getAllSnippets, getFilteredSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets, renderActions } from "../utils/tabulateSnippets.ts";
import chalk from "chalk";

const list = new Command();

list
    .name("list")
    .description("List all snippets.")
    .option("-l, --ext <ext...>", "Filter by extension")
    .option("-t, --tags <tags...>", "Filter by one or more tags");

const listAction = async (options: { ext?: string[]; tags?: string[] }) => {
    const hasFilter = options.ext?.length || (options.tags && options.tags.length > 0);

    const snippets = hasFilter
        ? getFilteredSnippets({ ext: options.ext, tags: options.tags })
        : getAllSnippets();

    if (snippets.length === 0) {
        const parts: string[] = [];
        if (options.ext?.length) parts.push(`extension(s): ${options.ext.join(", ")}`);
        if (options.tags?.length) parts.push(`tag(s): ${options.tags.join(", ")}`);
        const filterDesc = parts.length ? ` for ${parts.join(" and ")}` : "";
        console.log(chalk.yellow(`No snippets found${filterDesc}.`));
        return;
    }

    const selections = tabulateSnippets(snippets);
    if (!selections) return;
    await renderActions(selections, snippets);
}

list.action(listAction);

export default list;
