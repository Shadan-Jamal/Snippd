import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import { getAllSnippets } from "@/db/queries/snippets.ts";
import { tabulateSnippets } from "@/src/utils/tabulateUtil.ts";
import type { SnippetWithTags } from "@/src/types/index.ts";
type EditAction = "content" | "title" | "ext" | "tags" | "add-tags" | "remove-tags" | "reindex";

const DEFAULT_PARSE_ARGS = ["node", "yarn dev -- "];

async function pickSnippet(): Promise<SnippetWithTags | undefined> {
    const snippets = getAllSnippets();
    if (!snippets.length) {
        console.log(chalk.yellow("No snippets available to edit."));
        return undefined;
    }

    return select({
        message: "Select a snippet to edit",
        choices: tabulateSnippets(snippets),
        pageSize: 10,
        theme: { prefix: "" },
    });
}

async function pickEditAction(snippet: SnippetWithTags): Promise<EditAction | "cancel"> {
    console.log(
        chalk.dim(
            `  .${snippet.extension}  tags: ${snippet.tags.map((t) => t.name).join(", ") || "none"}\n`,
        ),
    );

    return select({
        message: "What would you like to edit?",
        choices: [
            { name: "Edit content (open in editor)", value: "content" },
            { name: "Rename title", value: "title" },
            { name: "Change extension", value: "ext" },
            { name: "Replace all tags", value: "tags" },
            { name: "Add tags", value: "add-tags" },
            { name: "Remove tags", value: "remove-tags" },
            { name: "Reindex embeddings", value: "reindex" },
            { name: chalk.dim("  Cancel"), value: "cancel" },
        ],
    });
}

async function runEditForSnippet(
    snippet: SnippetWithTags,
    argsPrefix: string[],
): Promise<void> {
    const editWhat = await pickEditAction(snippet);
    if (editWhat === "cancel") return;

    const args = [...argsPrefix, "edit", snippet.title];

    if (editWhat === "content") {
        await program.parseAsync(args);
        return;
    }

    if (editWhat === "reindex") {
        await program.parseAsync([...args, "--reindex"]);
        return;
    }

    if (editWhat === "title") {
        const newTitle = await input({
            message: "New title:",
            validate: (v) => v.trim().length > 0 || "Title cannot be empty.",
        });
        await program.parseAsync([...args, "--title", newTitle.trim()]);
        return;
    }

    if (editWhat === "ext") {
        const newExt = await input({
            message: "New extension (e.g. ts, py):",
            validate: (v) => v.trim().length > 0 || "Extension cannot be empty.",
        });
        await program.parseAsync([...args, "--ext", newExt.trim()]);
        return;
    }

    if (editWhat === "tags") {
        const tagsRaw = await input({
            message: "New tags (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        await program.parseAsync([
            ...args,
            "--tags",
            ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        ]);
        return;
    }

    if (editWhat === "add-tags") {
        const tagsRaw = await input({
            message: "Tags to add (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        await program.parseAsync([
            ...args,
            "--add-tags",
            ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        ]);
        return;
    }

    if (editWhat === "remove-tags") {
        const tagsRaw = await input({
            message: "Tags to remove (comma-separated):",
            validate: (v) => v.trim().length > 0 || "Provide at least one tag.",
        });
        await program.parseAsync([
            ...args,
            "--remove-tags",
            ...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        ]);
    }
}

export const editInteractiveFlow = async (cmdArgs: string[] = DEFAULT_PARSE_ARGS): Promise<void> => {
    console.log(chalk.cyan("\n Edit a Snippet\n"));

    const snippet = await pickSnippet();
    if (!snippet) return;

    await runEditForSnippet(snippet, cmdArgs);
};
