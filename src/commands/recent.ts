import { Command } from "commander";
import { getRecentSnippets } from "../../db/queries/snippets.ts";
import { renderActions, tabulateSnippets } from "../utils/tabulateSnippets.ts";

const recent = new Command();

recent
    .name("recent")
    .description("Show the recently created or edited snippets.")
    .option("-l, --limit [number]", "Limit the number of snippets to show. Defaults to 30 if limit not provided.", "30")
    ;

const recentAction = async (options: { limit?: string }) => {
    const recentSnippets = getRecentSnippets(options.limit);
    const tabulatedSnippets = tabulateSnippets(recentSnippets, false);
    if (!tabulatedSnippets) return;
    await renderActions(tabulatedSnippets, recentSnippets);
};

recent.action(recentAction);

export default recent;