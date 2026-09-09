import { select } from "@inquirer/prompts";
import { SnippetWithTags } from "../types/index.ts";
import { deleteSnippet, updateSnippet } from "../../db/queries/snippets.ts";
import { openEditorForInput, openEditorForView } from "./editor.ts";
import clipboard from "clipboardy";
import chalk from "chalk";

const displayName = (e: SnippetWithTags) => {
    const ext = e.extension.replace(/^\./, "");
    return `${e.title}.${ext}`;
};

export const pad = (str: string, width: number) => str.padEnd(width);

export const col = (entries: SnippetWithTags[]) => {
    const idW = Math.max(2, ...entries.map(e => `[${e.id}]`.length)) + 2;
    const titleW = Math.max(5, ...entries.map(e => displayName(e).length)) + 2;
    const tagsW = Math.max(3, ...entries.map(e => e.tags?.map(t => t.name).join(", ").length)) + 2;
    return { idW, titleW, tagsW };
};

export const tabulateSnippets = (
    rawEntries: SnippetWithTags[],
    viewOnly: boolean = false,
): { name: string; value: SnippetWithTags }[] | undefined => {
    const { idW, titleW, tagsW } = col(rawEntries);
    const header = `  ${pad("ID", idW)}${pad("Name", titleW)}${pad("Tags", tagsW)}`;
    const separator = "─".repeat(header.length);

    const selections = rawEntries.map((entry) => {
        const id = pad(`[${entry.id}]`, idW);
        const name = pad(displayName(entry), titleW);
        const tags = pad(entry.tags?.map(t => t.name).join(", ") || "—", tagsW);
        return {
            name: `${id}${name}${tags}`,
            value: entry,
        };
    });

    console.log(chalk.bold(`Results (${rawEntries.length})`));
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
            { name: chalk.yellow("Go Back"), value: "back" },
            { name: chalk.red("Cancel"), value: "cancel" },
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

        case "edit": {
            const updated = await openEditorForInput({
                initialContent: selected.snippet,
                extension: selected.extension,
                message: `Editing "${selected.title}"`,
                validate: (value) => value.trim().length > 0 || "Snippet cannot be empty.",
            });
            if (updated.trim() && updated !== selected.snippet) {
                updateSnippet(selected.id, { snippet: updated });
                console.log(chalk.green("Snippet updated successfully ✅"));
            } else if (!updated.trim()) {
                console.log(chalk.yellow("No changes saved (empty content)."));
            } else {
                console.log(chalk.yellow("No changes detected."));
            }
            break;
        }

        case "view":
            await openEditorForView(selected.snippet, selected.extension);
            break;
    }
};