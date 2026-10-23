import { Command } from "commander";
import { getRecentSnippets } from "@/db/queries/snippets.ts";
import { renderSnippetActions, tabulateSnippets } from "@/src/utils/tabulateUtil.ts";

const recent = new Command();

recent
    .name("recent")
    .description("Show the recently created or edited snippets.")
    .option("-l, --limit [number]", "Limit the number of snippets to show. Defaults to 10 if limit not provided.", "10")
    .option("-s, --search <query>", "Filter recent snippets by a search query");

const recentAction = async (options: { limit?: string; search?: string }) => {
    let recentSnippets = getRecentSnippets(options.limit);

    if (options.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        recentSnippets = recentSnippets.filter((snippet) =>
            snippet.title.toLowerCase().includes(q)
            || snippet.code.toLowerCase().includes(q)
            || snippet.extension.toLowerCase().includes(q)
            || snippet.tags.some((tag) => tag.name.toLowerCase().includes(q)),
        );
    }

    const tabulatedSnippets = tabulateSnippets(recentSnippets);
    if (!tabulatedSnippets) return;
    await renderSnippetActions(tabulatedSnippets, recentSnippets);
};

recent.action(recentAction);

export default recent;