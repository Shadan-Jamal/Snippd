import { select } from "@inquirer/prompts";
import { SnippetWithTags } from "../types/index.ts";
import { deleteSnippet } from "../../db/queries/snippets.ts";
import clipboard from "clipboardy";
import chalk from "chalk";

export const pad = (str: string, width: number) => str.padEnd(width);

export const col = (entries: SnippetWithTags[]) => {
    const idW = Math.max(2, ...entries.map(e => `[${e.id}]`.length)) + 2;
    const titleW = Math.max(5, ...entries.map(e => e.title.length)) + 2;
    const extW = Math.max(8, ...entries.map(e => e.extension.length)) + 2;

    return { idW, titleW, extW };
};

export const tabulateSnippets = (
    rawEntries: SnippetWithTags[],
    viewOnly: boolean = false,
): { name: string; value: SnippetWithTags }[] | undefined => {
    const { idW, titleW, extW } = col(rawEntries);
    const header = `${pad("ID", idW)}${pad("Title", titleW)}${pad("Extension", extW)}Tags`;
    const separator = "─".repeat(header.length);

    const selections = rawEntries.map((entry) => {
        const id = pad(`[${entry.id}]`, idW);
        const title = pad(entry.title, titleW);
        const ext = pad(entry.extension, extW);
        const tags = entry.tags?.map(t => t.name).join(", ") || "—";
        return {
            name: `${id}${title}${ext}${tags}`,
            value: entry,
        };
    });

    console.log(`Search Results (${rawEntries.length})`);
    console.log(separator);
    console.log(header);
    console.log(separator);

    if (viewOnly) {
        console.log(selections.map(s => s.name).join("\n"));
        return;
    }

    return selections;
};

export const renderActions = async (
    selections: { name: string; value: SnippetWithTags }[],
    rawEntries: SnippetWithTags[],
    onBack?: () => Promise<void>,
) => {
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
        case "back": {
            console.clear();
            if (onBack) {
                // Return to parent flow (e.g. extension picker in exts command)
                await onBack();
            } else {
                // Default back: re-show the same snippet list
                const newSelections = tabulateSnippets(rawEntries);
                if (newSelections) await renderActions(newSelections, rawEntries);
            }
            return;
        }

        case "cancel":
            break;

        case "copy":
            await clipboard.write(selected.snippet);
            console.log(chalk.green("Copied to Clipboard ✅"));
            break;

        case "delete":
            try {
                deleteSnippet(selected.title);
                console.log(chalk.green("Snippet deleted successfully ✅"));
                break;
            } catch (err) {
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