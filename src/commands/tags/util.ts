import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import { getTagsWithCounts } from "@/db/queries/tags.ts";

type TagAction = "browse" | "view" | "rename" | "delete" | "back";

async function pickTag(message: string): Promise<string | undefined> {
    const tagsWithCounts = getTagsWithCounts();
    if (tagsWithCounts.length === 0) {
        console.log(chalk.yellow("No tags found."));
        return undefined;
    }

    const selected = await select({
        message,
        choices: [
            ...tagsWithCounts.map((tag) => ({
                name: `${tag.name} ${chalk.dim(`(${tag.snippet_count})`)}`,
                value: tag.name,
            })),
            { name: chalk.dim("  Cancel"), value: "__cancel__" },
        ],
        pageSize: 10,
    });

    return selected === "__cancel__" ? undefined : selected;
}

export const tagsInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack?: () => Promise<void>,
): Promise<void> => {
    const choices: { name: string; value: TagAction }[] = [
        { name: "Browse all tags", value: "browse" },
        { name: "View snippets by tag", value: "view" },
        { name: "Rename a tag", value: "rename" },
        { name: "Delete a tag", value: "delete" },
    ];
    if (onBack) {
        choices.push({ name: chalk.dim("  Back to menu"), value: "back" });
    }

    const action = await select<TagAction>({
        message: "Tags — what would you like to do?",
        choices,
    });

    if (action === "back") {
        if (onBack) await onBack();
        return;
    }

    if (action === "browse") {
        await program.parseAsync([...parseAsyncArgs, "tags"]);
        return;
    }

    if (action === "view") {
        const tagName = await pickTag("Select a tag to view:");
        if (!tagName) return;
        await program.parseAsync([...parseAsyncArgs, "tags", "view", tagName]);
        return;
    }

    if (action === "rename") {
        const oldName = await pickTag("Select a tag to rename:");
        if (!oldName) return;
        const newName = await input({
            message: "New tag name:",
            validate: (v) => v.trim().length > 0 || "Tag name cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "tags", "rename", oldName, newName.trim()]);
        return;
    }

    if (action === "delete") {
        const tagName = await pickTag("Select a tag to delete:");
        if (!tagName) return;
        await program.parseAsync([...parseAsyncArgs, "tags", "delete", tagName]);
    }
};
