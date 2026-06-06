import { SnippetWithTags } from "../types/index.ts";
import { select } from "@inquirer/prompts";

export const renderChoices = async (rawEntries: SnippetWithTags[]): Promise<any> => {
    console.log(`Search Results (${rawEntries.length})`);
    console.log("-------------------------------------");
    console.log("  ID \tTitle \tLanguage");
    const choices = rawEntries.map((entry) => ({
        name: `[${entry.id}] ${entry.title}  (${entry.language})`,
        value: entry.snippet,
    }));

    const selected = await select({
        message: "Select a snippet",
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