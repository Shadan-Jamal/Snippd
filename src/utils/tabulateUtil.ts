import { select } from "@inquirer/prompts";
import { SnippetWithTags, Container } from "../types/index.ts";
import {
    deleteSnippet,
    getSnippetContainers,
    removeSnippetFromContainer,
    updateSnippet,
} from "../../db/queries/snippets.ts";
import { openEditorForInput, openEditorForView } from "./editor.ts";
import clipboard from "clipboardy";
import chalk from "chalk";
import {
    addSnippetToContainer,
    getAllContainers,
    getContainerSnippets,
} from "../../db/queries/containers.ts";
import {
    displayName,
    formatContainerChoices,
    formatSnippetChoices,
    printHeading,
    printSubHeading,
} from "./typographyUtil.ts";

export const tabulateSnippets = (
    rawEntries: SnippetWithTags[],
): { name: string; value: SnippetWithTags }[] => {
    const { header, selections } = formatSnippetChoices(rawEntries);
    printHeading(rawEntries.length, header);
    return selections;
};

export const tabulateNestedSnippets = (
    parentName: string,
    rawEntries: SnippetWithTags[],
): { name: string; value: SnippetWithTags }[] => {
    const { header, selections } = formatSnippetChoices(rawEntries, { nested: true });
    printSubHeading(parentName, rawEntries.length, header);
    return selections;
};

export const tabulateContainers = (
    rawEntries: Container[],
): { name: string; value: Container }[] => {
    const { header, selections } = formatContainerChoices(rawEntries);
    printHeading(rawEntries.length, header);
    return selections;
};

export const tabulateNestedContainers = (
    parentName: string,
    rawEntries: Container[],
): { name: string; value: Container }[] => {
    const { header, selections } = formatContainerChoices(rawEntries, { nested: true });
    printSubHeading(parentName, rawEntries.length, header, { childLabel: "container" });
    return selections;
};

const pickContainer = async (
    rawEntries: Container[],
    nestedUnder?: string,
): Promise<Container | undefined> => {
    if (!rawEntries.length) return undefined;

    const selections = nestedUnder
        ? tabulateNestedContainers(nestedUnder, rawEntries)
        : tabulateContainers(rawEntries);

    return select({
        message: "",
        choices: selections,
        pageSize: 10,
        theme: { prefix: "" },
    });
};

export const renderSnippetActions = async (
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
            { name: "Add to Container", value: "add" },
            { name: "Remove from Container", value: "remove" },
            { name: chalk.yellow("Go Back"), value: "back" },
            { name: chalk.red("Cancel"), value: "cancel" },
        ],
    });

    // Action Resolver
    switch (action) {
        case "back": {
            console.clear();
            if (onBack) {
                await onBack();
            } else {
                const newSelections = tabulateSnippets(rawEntries);
                if (newSelections) await renderSnippetActions(newSelections, rawEntries);
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
                const deleted = deleteSnippet(selected.title);
                if (deleted) {
                    console.log(chalk.green("Snippet deleted successfully ✅"));
                } else {
                    console.log(chalk.red("Failed to delete snippet."));
                }
            } catch {
                console.log(chalk.red("Failed to delete snippet."));
            }
            break;

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

        case "add": {
            const allContainers = getAllContainers();
            if (!allContainers.length) {
                console.log(chalk.red("No containers found."));
                break;
            }

            const alreadyIn = new Set(getSnippetContainers(selected.title).map((c) => c.id));
            const available = allContainers.filter((c) => !alreadyIn.has(c.id));
            if (!available.length) {
                console.log(chalk.yellow("Snippet is already in every container."));
                break;
            }

            const picked = await pickContainer(available, displayName(selected));
            if (!picked) break;

            try {
                addSnippetToContainer({ containerId: picked.id, snippetId: selected.id });
                console.log(chalk.green(`Added to ${chalk.bold(picked.name)} ✅`));
            } catch {
                console.log(chalk.red("Failed to add snippet to container."));
            }
            break;
        }

        case "remove": {
            const containers = getSnippetContainers(selected.title);
            if (!containers.length) {
                console.log(chalk.yellow("Snippet is not in any container."));
                break;
            }

            const picked = await pickContainer(containers, displayName(selected));
            if (!picked) break;

            try {
                const removed = removeSnippetFromContainer({
                    containerId: picked.id,
                    snippetId: selected.id,
                });
                if (removed) {
                    console.log(chalk.green(`Removed from ${chalk.bold(picked.name)} ✅`));
                } else {
                    console.log(chalk.red("Failed to remove snippet from container."));
                }
            } catch {
                console.log(chalk.red("Failed to remove snippet from container."));
            }
            break;
        }

        case "view":
            await openEditorForView(selected.snippet, selected.extension);
            break;
    }
};

export const renderContainerActions = async (
    rawEntries: Container[],
    onBack?: () => Promise<void>,
) => {
    const selections = tabulateContainers(rawEntries);

    const selected = await select({
        message: "",
        choices: selections,
        pageSize: 10,
        theme: { prefix: "" },
    });

    const containerSnippets = getContainerSnippets(selected.id);
    if (!containerSnippets || containerSnippets.length === 0) {
        console.clear();
        console.log(chalk.red("No snippets in ") + chalk.bold(selected.name));
        if (onBack) {
            await onBack();
        } else {
            await renderContainerActions(rawEntries, onBack);
        }
        return;
    }

    const nestedSelections = tabulateNestedSnippets(selected.name, containerSnippets);
    await renderSnippetActions(nestedSelections, containerSnippets, async () => {
        console.clear();
        await renderContainerActions(rawEntries, onBack);
    });
};
