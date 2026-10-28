import { Command } from "commander";
import { getRecentSnippets } from "@/db/queries/snippets.ts";
import { renderSnippetActions, tabulateRecentSnippets } from "@/src/utils/tabulateUtil.ts";

const recent = new Command();

recent
    .name("recent")
    .description("Show snippets ordered by last edited time.")
    .option("-l, --limit [number]", "Limit the number of snippets to show. Defaults to 10 if limit not provided.", "10")
    .option("-s, --search <query>", "Search snippet title, tags, content, or extension");

const recentAction = async (options: { limit?: string; search?: string }) => {
    const recentSnippets = getRecentSnippets(options.limit, options.search);
    if (recentSnippets.length === 0) {
        console.log("No recent snippets found.");
        return;
    }

    const tabulatedSnippets = tabulateRecentSnippets(recentSnippets);
    await renderSnippetActions(tabulatedSnippets, recentSnippets);
};

recent.action(recentAction);

export default recent;