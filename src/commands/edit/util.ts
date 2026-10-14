import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";

export const editInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\n Edit a Snippet\n"));

    const title = await input({
        message: "Snippet title to edit:",
        validate: (v) => v.trim().length > 0 || "Title cannot be empty.",
    });

    const editWhat = await select({
        message: "What would you like to edit?",
        choices: [
            { name: "Edit content (open in editor)", value: "content" },
            { name: "Rename title", value: "title" },
            { name: "Change extension", value: "ext" },
            { name: "Replace all tags", value: "tags" },
            { name: "Add tags", value: "add-tags" },
            { name: "Remove tags", value: "remove-tags" },
        ],
    });

    const args = [...parseAsyncArgs, "edit", title.trim()];

    if (editWhat === "content") {
        // No extra args — the command opens the editor automatically
        await program.parseAsync(args);
        return;
    }

    if (editWhat === "title") {
        const newTitle = await input({
            message: "New title:",
            validate: (v) => v.trim().length > 0 || "Title cannot be empty.",
        });
        args.push("--title", newTitle.trim());
    }

    if (editWhat === "ext") {
        const newExt = await input({
            message: "New extension (e.g. ts, py):",
            validate: (v) => v.trim().length > 0 || "Extension cannot be empty.",
        });
        args.push("--ext", newExt.trim());
    }

    if (editWhat === "tags") {
        const tagsRaw = await input({
            message: "New tags (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        args.push("--tags", ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean));
    }

    if (editWhat === "add-tags") {
        const tagsRaw = await input({
            message: "Tags to add (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        args.push("--add-tags", ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean));
    }

    if (editWhat === "remove-tags") {
        const tagsRaw = await input({
            message: "Tags to remove (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        args.push("--remove-tags", ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean));
    }

    await program.parseAsync(args);
};
