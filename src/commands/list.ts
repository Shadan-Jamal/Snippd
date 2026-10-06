import { Command } from "commander";
import { getAllSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets, renderSnippetActions } from "../utils/tabulateUtil.ts";
import { searchSnippetsByFields } from "../utils/searchUtil.ts";
import chalk from "chalk";

const list = new Command();

list
    .name("list")
    .description("List all snippets. Recommended to use the UI for better view.")
    .option("-e, --ext <ext...>", "Filter by extension")
    .option("-t, --tags <tags...>", "Filter by one or more tags")
    .option("-s, --search <query>", "Filter by a search query (title and content)");

const listAction = async (options: { ext?: string[]; tags?: string[]; search?: string }) => {
    let snippets = options.search?.trim()
        ? searchSnippetsByFields(options.search, { title: true, content: true })
        : getAllSnippets();

    if (options.ext?.length || (options.tags && options.tags.length > 0)) {
        const requiredExts = new Set((options.ext ?? []).map((ext) => ext.toLowerCase()));
        const requiredTags = (options.tags ?? []).map((tag) => tag.toLowerCase());

        snippets = snippets.filter((snippet) => {
            const matchesExt = requiredExts.size === 0 || requiredExts.has(snippet.extension.toLowerCase());
            const snippetTagNames = snippet.tags.map((tag) => tag.name.toLowerCase());
            const matchesTags = requiredTags.length === 0 || requiredTags.every((tag) => snippetTagNames.includes(tag));
            return matchesExt && matchesTags;
        });
    }

    if (snippets.length === 0) {
        const parts: string[] = [];
        if (options.search?.trim()) parts.push(`search: ${options.search.trim()}`);
        if (options.ext?.length) parts.push(`extension(s): ${options.ext.join(", ")}`);
        if (options.tags?.length) parts.push(`tag(s): ${options.tags.join(", ")}`);
        const filterDesc = parts.length ? ` for ${parts.join(" and ")}` : "";
        console.log(chalk.yellow(`No snippets found${filterDesc}.`));
        return;
    }

    const selections = tabulateSnippets(snippets);
    if (!selections) return;
    await renderSnippetActions(selections, snippets);
};

list.action(listAction);

export default list;
