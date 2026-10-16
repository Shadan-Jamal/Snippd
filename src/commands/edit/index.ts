import { Command } from "commander";
import chalk from "chalk";
import { getSnippetByIdentifier, updateSnippet, updateSnippetTitle } from "@/db/queries/snippets.ts";
import { setTagsForSnippet, attachTagsToSnippet, removeTagFromSnippet } from "@/db/queries/tags.ts";
import { openEditorForInput } from "@/src/utils/editor.ts";
import { extractExtensionFromTitle } from "../exts/util.ts";
import { editInteractiveFlow } from "./util.ts";
import { indexSnippet } from "@/src/utils/indexSnippet.ts";

const edit = new Command();

edit
    .name("edit")
    .description("Edit a snippet. Omit title to pick from a list.")
    .argument("[title]", "Title of the snippet to edit")
    .option("--title <new-title>", "Change the snippet title")
    .option("--ext <ext>", "Change the file extension")
    .option("--tags <tags...>", "Replace all tags with the provided tags")
    .option("--add-tags <tags...>", "Add tags to the snippet")
    .option("--remove-tags <tags...>", "Remove specific tags from the snippet")
    .option("--reindex", "Rebuild embeddings for this snippet")
    .action(async (title: string | undefined, options: {
        title?: string;
        ext?: string;
        tags?: string[];
        addTags?: string[];
        removeTags?: string[];
        reindex?: boolean;
    }) => {
        if (!title?.trim()) {
            await editInteractiveFlow();
            return;
        }

        const { cleanTitle } = extractExtensionFromTitle(title);

        const snippet = getSnippetByIdentifier(cleanTitle);
        if (!snippet) {
            console.log(chalk.red(`Snippet "${cleanTitle}" not found.`));
            return;
        }

        if (options.reindex) {
            console.log(chalk.cyan(`Reindexing "${cleanTitle}"…`));
            try {
                const ok = await indexSnippet(snippet.id);
                if (ok) {
                    console.log(chalk.green(`Embeddings updated for "${cleanTitle}" ✅`));
                } else {
                    console.log(chalk.red(
                        "Reindex failed. Check Ollama is running and the embedding model is configured.",
                    ));
                }
            } catch (err) {
                console.log(chalk.red(`Reindex failed: ${err instanceof Error ? err.message : String(err)}`));
            }
            return;
        }

        let hasChanges = false;

        if (options.title) {
            if (options.title !== cleanTitle) {
                try {
                    const updated = updateSnippetTitle(snippet.id, options.title);
                    if (updated) {
                        console.log(chalk.green(`Title changed from "${cleanTitle}" to "${options.title}"`));
                        hasChanges = true;
                    } else {
                        console.log(chalk.red("Failed to update title. It may already exist."));
                    }
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (message.includes("UNIQUE constraint")) {
                        console.log(chalk.red(`A snippet titled "${options.title}" already exists.`));
                    } else {
                        console.log(chalk.red(`Failed to update title: ${message}`));
                    }
                }
            } else {
                console.log(chalk.yellow("New title is the same as the current title."));
            }
        }

        if (options.ext) {
            if (options.ext !== snippet.extension) {
                try {
                    updateSnippet(snippet.id, { extension: options.ext });
                    console.log(chalk.green(`Extension changed from "${snippet.extension}" to "${options.ext}"`));
                    hasChanges = true;
                } catch (err) {
                    console.log(chalk.red(`Failed to update extension: ${err instanceof Error ? err.message : String(err)}`));
                }
            }
        }

        if (options.tags) {
            const parsedTags = options.tags.flatMap((tag) => tag.split(",").map((t) => t.trim()).filter(Boolean));
            try {
                setTagsForSnippet(snippet.id, parsedTags);
                console.log(chalk.green(`Tags replaced with: ${parsedTags.join(", ")}`));
                hasChanges = true;
            } catch (err) {
                console.log(chalk.red(`Failed to update tags: ${err instanceof Error ? err.message : String(err)}`));
            }
        }

        if (options.addTags) {
            const parsedTags = options.addTags.flatMap((tag) => tag.split(",").map((t) => t.trim()).filter(Boolean));
            try {
                attachTagsToSnippet(snippet.id, parsedTags);
                void import("@/src/utils/indexSnippet.ts")
                    .then(({ scheduleIndexSnippet }) => scheduleIndexSnippet(snippet.id))
                    .catch(() => {});
                console.log(chalk.green(`Tags added: ${parsedTags.join(", ")}`));
                hasChanges = true;
            } catch (err) {
                console.log(chalk.red(`Failed to add tags: ${err instanceof Error ? err.message : String(err)}`));
            }
        }

        if (options.removeTags) {
            const parsedTags = options.removeTags.flatMap((tag) => tag.split(",").map((t) => t.trim()).filter(Boolean));
            let removedCount = 0;
            for (const tag of parsedTags) {
                const removed = removeTagFromSnippet(snippet.id, tag);
                if (removed) removedCount++;
            }
            if (removedCount > 0) {
                console.log(chalk.green(`Tags removed: ${parsedTags.join(", ")}`));
                hasChanges = true;
            } else {
                console.log(chalk.yellow("None of the specified tags were found on this snippet."));
            }
        }

        if (!hasChanges && !options.title && !options.ext && !options.tags && !options.addTags && !options.removeTags) {
            console.log(chalk.cyan(`Editing snippet "${cleanTitle}"`));
            console.log(chalk.dim(`Current extension: .${snippet.extension}`));
            console.log(chalk.dim(`Current tags: ${snippet.tags.map(t => t.name).join(", ") || "none"}`));
            console.log();

            const updatedContent = await openEditorForInput({
                initialContent: snippet.code,
                extension: snippet.extension,
                message: `Editing "${cleanTitle}"`,
                validate: (value) => value.trim().length > 0 || "Snippet cannot be empty.",
            });

            if (updatedContent.trim() && updatedContent !== snippet.code) {
                try {
                    updateSnippet(snippet.id, { code: updatedContent });
                    console.log(chalk.green("Snippet content updated successfully ✅"));
                } catch (err) {
                    console.log(chalk.red(`Failed to update snippet: ${err instanceof Error ? err.message : String(err)}`));
                }
            } else if (!updatedContent.trim()) {
                console.log(chalk.yellow("No changes saved (empty content)."));
            } else {
                console.log(chalk.yellow("No changes detected."));
            }
        } else if (hasChanges) {
            console.log(chalk.green("Snippet updated successfully ✅"));
        }
    });

export default edit;
