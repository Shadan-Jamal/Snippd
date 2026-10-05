import { Command } from "commander";
import chalk from "chalk";
import { getSnippetByIdentifier } from "../../db/queries/snippets.ts";
import { updateSnippet, updateSnippetTitle } from "../../db/queries/snippets.ts";
import { setTagsForSnippet, attachTagsToSnippet, removeTagFromSnippet } from "../../db/queries/tags.ts";
import { openEditorForInput } from "../utils/editor.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";

const edit = new Command();

edit
    .name("edit")
    .description("Edit a snippet.")
    .argument("<title>", "Title of the snippet to edit")
    .option("--title <new-title>", "Change the snippet title")
    .option("--ext <ext>", "Change the file extension")
    .option("--tags <tags...>", "Replace all tags with the provided tags")
    .option("--add-tags <tags...>", "Add tags to the snippet")
    .option("--remove-tags <tags...>", "Remove specific tags from the snippet")
    .action(async (title: string, options: {
        title?: string;
        ext?: string;
        tags?: string[];
        addTags?: string[];
        removeTags?: string[];
    }) => {
        // Extract extension from title if present
        const { cleanTitle, extension: titleExtension } = extractExtensionFromTitle(title);

        const snippet = getSnippetByIdentifier(cleanTitle);
        if (!snippet) {
            console.log(chalk.red(`Snippet "${cleanTitle}" not found.`));
            return;
        }

        let hasChanges = false;

        // Handle title change
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

        // Handle extension change
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

        // Handle tag replacement
        if (options.tags) {
            try {
                setTagsForSnippet(snippet.id, options.tags);
                console.log(chalk.green(`Tags replaced with: ${options.tags.join(", ")}`));
                hasChanges = true;
            } catch (err) {
                console.log(chalk.red(`Failed to update tags: ${err instanceof Error ? err.message : String(err)}`));
            }
        }

        // Handle adding tags
        if (options.addTags) {
            try {
                attachTagsToSnippet(snippet.id, options.addTags);
                console.log(chalk.green(`Tags added: ${options.addTags.join(", ")}`));
                hasChanges = true;
            } catch (err) {
                console.log(chalk.red(`Failed to add tags: ${err instanceof Error ? err.message : String(err)}`));
            }
        }

        // Handle removing tags
        if (options.removeTags) {
            let removedCount = 0;
            for (const tag of options.removeTags) {
                const removed = removeTagFromSnippet(snippet.id, tag);
                if (removed) removedCount++;
            }
            if (removedCount > 0) {
                console.log(chalk.green(`Tags removed: ${options.removeTags.join(", ")}`));
                hasChanges = true;
            } else {
                console.log(chalk.yellow("None of the specified tags were found on this snippet."));
            }
        }

        // If no metadata changes, open editor for content editing
        if (!hasChanges && !options.title && !options.ext && !options.tags && !options.addTags && !options.removeTags) {
            console.log(chalk.cyan(`Editing snippet "${cleanTitle}"`));
            console.log(chalk.dim(`Current extension: .${snippet.extension}`));
            console.log(chalk.dim(`Current tags: ${snippet.tags.map(t => t.name).join(", ") || "none"}`));
            console.log();

            const updatedContent = await openEditorForInput({
                initialContent: snippet.snippet,
                extension: snippet.extension,
                message: `Editing "${cleanTitle}"`,
                validate: (value) => value.trim().length > 0 || "Snippet cannot be empty.",
            });

            if (updatedContent.trim() && updatedContent !== snippet.snippet) {
                try {
                    updateSnippet(snippet.id, { snippet: updatedContent });
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
