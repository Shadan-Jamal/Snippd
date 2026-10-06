import { Command } from "commander";
import { getRecentSnippets } from "../../db/queries/snippets.ts";
import { renderSnippetActions, tabulateSnippets } from "../utils/tabulateUtil.ts";
import { searchSnippetsByFields } from "../utils/searchUtil.ts";

const recent = new Command();

recent
    .name("recent")
    .description("Show the recently created or edited snippets.")
    .option("-l, --limit [number]", "Limit the number of snippets to show. Defaults to 30 if limit not provided.", "30")
    .option("-s, --search <query>", "Filter recent snippets by a search query");

const recentAction = async (options: { limit?: string; search?: string }) => {
    let recentSnippets = getRecentSnippets(options.limit);

    if (options.search?.trim()) {
        const matchingIds = new Set(
            searchSnippetsByFields(options.search, { title: true, content: true }).map((snippet) => snippet.id),
        );
        recentSnippets = recentSnippets.filter((snippet) => matchingIds.has(snippet.id));
    }

    const tabulatedSnippets = tabulateSnippets(recentSnippets);
    if (!tabulatedSnippets) return;
    await renderSnippetActions(tabulatedSnippets, recentSnippets);
};

recent.action(recentAction);

export default recent;