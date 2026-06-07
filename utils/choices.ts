import { SnippetWithTags } from "../types/index.ts";
import { select } from "@inquirer/prompts";
import { deleteSnippet } from "../db/queries/snippets.ts";
import clipboard from "clipboardy";
import chalk from "chalk";

const pad = (str: string, width: number) => str.padEnd(width);

const col = (entries: SnippetWithTags[]) => {
    const idW = Math.max(2, ...entries.map(e => `[${e.id}]`.length)) + 2;
    const titleW = Math.max(5, ...entries.map(e => e.title.length)) + 2;
    const langW = Math.max(8, ...entries.map(e => e.language.length)) + 2;

    return { idW, titleW, langW };
};

export const choices = async (rawEntries: SnippetWithTags[]): Promise<void> => {
    const { idW, titleW, langW } = col(rawEntries);

    const header = `  ${pad("ID", idW)}${pad("Title", titleW)}${pad("Language", langW)}Tags`;
    const separator = "─".repeat(header.length);

    console.log(`Search Results (${rawEntries.length})`);
    console.log(separator);
    console.log(header);
    console.log(separator);

    const selections = rawEntries.map((entry) => {
        const id = pad(`[${entry.id}]`, idW);
        const title = pad(entry.title, titleW);
        const lang = pad(entry.language, langW);
        const tags = entry.tags?.map(t => t.name).join(", ") || "—";
        return {
            name: `${id}${title}${lang}${tags}`,
            value: entry,
        };
    });

    const selected = await select({
        message: "",
        choices: selections,
        pageSize: 10,
        theme: { prefix: "" },
    });

    const action = await select({
        message: "What do you want to do?",
        choices: [
            { name: "Copy to clipboard", value: "copy" },
            { name: "View Snippet", value: "view" },
            { name: "Edit Snippet", value: "edit" },
            { name: "Delete Snippet", value: "delete" },
            { name: "Go Back", value: "back" },
            { name: "Cancel", value: "cancel" },
        ],
    });

    // Action Resolver
    switch (action) {
        case "back":
            console.clear();
            return choices(rawEntries);

        case "cancel":
            break;

        case "copy":
            await clipboard.write(selected.snippet);
            console.log(chalk.green("Copied to Clipboard ✅"));
            break;

        case "delete":
            try {
                const res = deleteSnippet(selected.title);
                console.log(chalk.green("Snippet deleted successfully ✅"));
                break;
            }
            catch (err) {
                console.log(chalk.red("Failed to delete snippet."));
                break;
            }

        case "edit":
            console.log("Editing");
            break;

        case "view":
            console.log("Viewing");
            break;
    }
};