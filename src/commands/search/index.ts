import { Command } from "commander";
import chalk from "chalk";
import { searchContainers, getContainerSnippets } from "@/db/queries/containers.ts";
import { tabulateContainers, tabulateSnippets, renderSnippetActions, tabulateNestedSnippets } from "@/src/utils/tabulateUtil.ts";
import { searchSnippetsByFields } from "./util.ts";
import { select } from "@inquirer/prompts";

const search = new Command();

search
    .name("search")
    .description("Full-text search across snippet titles, code, extensions, tags, and containers.")
    .argument("<query>", "Text to search for.")
    .option("--title", "Search snippet titles only")
    .option("--content", "Search snippet content only")
    .option("--ext", "Search snippet extensions only")
    .option("--container", "Search container names and descriptions only")
    .option("--tags", "Search tags only");

const searchAction = async (query: string, options: {
    title?: boolean;
    content?: boolean;
    ext?: boolean;
    container?: boolean;
    tags?: boolean;
}) => {
    const hasSnippetFilters = Boolean(options.title || options.content || options.ext || options.tags);
    const snippetOptions = {
        title: options.title ?? false,
        content: options.content ?? false,
        ext: options.ext ?? false,
        tags: options.tags ?? false,
    };

    // Container-only: pick a container, then its snippets
    if (options.container && !hasSnippetFilters) {
        const containers = searchContainers(query);
        if (!containers.length) {
            console.log(chalk.redBright(`No containers found for "${query}".`));
            return;
        }

        const selections = tabulateContainers(containers);
        if (!selections) return;
        const selected = await select({
            message: "",
            choices: selections,
            pageSize: 10,
            theme: { prefix: "" },
        });

        if (selected) {
            const snippetEntries = getContainerSnippets(selected.id);
            if (!snippetEntries.length) {
                console.log(chalk.yellow(`${selected.name} has no snippets.`));
                return;
            }
            const nested = tabulateNestedSnippets(selected.name, snippetEntries);
            await renderSnippetActions(nested, snippetEntries);
        }
        return;
    }

    let snippets = searchSnippetsByFields(query, snippetOptions);

    // Container + snippet filters: keep snippets that match fields AND live in a matching container
    if (options.container && hasSnippetFilters) {
        const containers = searchContainers(query);
        if (!containers.length) {
            console.log(chalk.redBright(`No containers found for "${query}".`));
            return;
        }
        const allowedIds = new Set(
            containers.flatMap((container) => getContainerSnippets(container.id).map((s) => s.id)),
        );
        snippets = snippets.filter((snippet) => allowedIds.has(snippet.id));
    }

    if (snippets.length === 0) {
        console.log(chalk.redBright(`No snippets found for "${query}".`));
        return;
    }

    const selections = tabulateSnippets(snippets);
    if (!selections) return;
    await renderSnippetActions(selections, snippets);
};

search.action(searchAction);

export default search;