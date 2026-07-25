import { Command } from "commander";
import { getRecentSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets } from "../utils/tabulateSnippets.ts";

const recent = new Command();

recent
    .name("recent")
    .description("Show the recently created or edited snippets.")
    .option("--limit [number]", "Limit the number of snippets to show. Defaults to 30 if limit not provided.", "30")
    ;

const recentAction = async (options: { limit?: string }) => {
    const snippets = getRecentSnippets(options.limit);
    tabulateSnippets(snippets, true);
};

recent.action(recentAction);

export default recent;