import { Command } from "commander";
import { searchSnippets } from "../db/queries/snippets.ts";
import { select, editor } from "@inquirer/prompts";
import { Snippet, SnippetWithTags } from "../types/index.ts";
import clipboard from "clipboardy";

const renderChoices = async (rawEntries: SnippetWithTags[]) => {

    const choices = rawEntries.map((entry) => ({
        name: `[${entry.id}] ${entry.title}  (${entry.language})`,
        value: entry.snippet,
    }));

    const selected = await select({
        message: `Search Results (${rawEntries.length})`,
        choices,
        pageSize: 10,
    });

    const action = await select({
        message: "What do you want to do?",
        choices: [
            { name: "Copy to clipboard", value: "copy" },
            { name: "View Snippet", value: "view" },
            { name: "Go Back", value: "back" },
            { name: "Cancel", value: "cancel" },
        ],
    });

    if (action === "back") {
        console.clear();
        return renderChoices(rawEntries);
    }
    if (action === "cancel") return;

    return { choice: selected, action };
};


const search = new Command();

search
    .name("search")
    .description("Search for a snippet.")
    .argument("<title>", "Title to search for")
    .option("-t, --tag [tag...]", "Tag to filter search.", [])
    .option("-l, --lang [lang]", "Language to filter search.", "");

const searchAction = async (title: string, options: { tag: string[], lang: string }) => {
    const snippets = searchSnippets(title);
    const result = await renderChoices(snippets);
    if (result?.action === "copy") {
        await clipboard.write(result.choice);
        console.log("Copied to Clipboard ✅");
    }
    if (result?.action === "view") {
        console.log("Opening Editor");
    }
}

search.action(searchAction);

export default search;