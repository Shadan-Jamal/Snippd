import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";

type TagAction = "browse" | "view" | "rename" | "delete" | "back";

export const tagsInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack: () => Promise<void>,
): Promise<void> => {
    const action = await select<TagAction>({
        message: "Tags — what would you like to do?",
        choices: [
            { name: "Browse all tags", value: "browse" },
            { name: "View snippets by tag", value: "view" },
            { name: "Rename a tag", value: "rename" },
            { name: "Delete a tag", value: "delete" },
            { name: chalk.dim("  Back to menu"), value: "back" },
        ],
    });

    if (action === "back") { await onBack(); return; }

    if (action === "browse") {
        await program.parseAsync([...parseAsyncArgs, "tags"]);
        return;
    }

    if (action === "view") {
        const tagName = await input({
            message: "Tag name:",
            validate: (v) => v.trim().length > 0 || "Tag name cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "tags", "view", tagName.trim()]);
        return;
    }

    if (action === "rename") {
        const oldName = await input({
            message: "Current tag name:",
            validate: (v) => v.trim().length > 0 || "Tag name cannot be empty.",
        });
        const newName = await input({
            message: "New tag name:",
            validate: (v) => v.trim().length > 0 || "Tag name cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "tags", "rename", oldName.trim(), newName.trim()]);
        return;
    }

    if (action === "delete") {
        const tagName = await input({
            message: "Tag name to delete:",
            validate: (v) => v.trim().length > 0 || "Tag name cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "tags", "delete", tagName.trim()]);
    }
};
