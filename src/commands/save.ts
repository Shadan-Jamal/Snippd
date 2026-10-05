import { Command } from "commander";
import { createSnippet } from "../../db/queries/snippets.ts";
import { openEditorForInput } from "../utils/editor.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";
import chalk from "chalk";

const save = new Command();

save
    .name("save")
    .description("Save a new snippet.")
    .argument("<title>", "Title of the Snippet")
    .option("-e, --ext <ext>", "Language extension of the snippet.", "txt")
    .option("-t, --tags <tags...>", "Tags to associate with the snippet.");

const saveAction = async (title: string, options: { tags?: string[]; ext: string }) => {
    // Extract extension from title if present
    const { cleanTitle, extension: titleExtension } = extractExtensionFromTitle(title);

    // Determine which extension to use
    let finalExtension = options.ext;
    if (titleExtension) {
        if (options.ext !== "txt" && options.ext !== titleExtension) {
            console.log(chalk.yellow(`⚠ Warning: Two extensions provided. Using extension from title "${titleExtension}" and ignoring --ext flag "${options.ext}".`));
        }
        finalExtension = titleExtension;
    }

    console.log(`Saving snippet to ${chalk.blueBright(cleanTitle)}`);
    if (options.tags?.length && finalExtension) {
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))} and extension .${chalk.blueBright(finalExtension)}`);
    } else if (options.tags?.length) {
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))}`);
    } else if (finalExtension) {
        console.log(`With extension .${chalk.blueBright(finalExtension)}`);
    }

    const snippetContent = await openEditorForInput({
        extension: finalExtension,
        message: `Editing snippet "${cleanTitle}"`,
        validate: (value) => value.trim().length > 0 || "Snippet cannot be empty.",
    });

    try {
        const snippet = createSnippet({
            title: cleanTitle,
            extension: finalExtension,
            snippet: snippetContent,
            tags: options.tags,
        });

        console.log(chalk.green("Snippet saved successfully"));
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("UNIQUE constraint failed: snippets.title")) {
            console.log(chalk.red(`A snippet titled "${cleanTitle}" already exists.`));
            return;
        }
        throw err;
    }
};

save.action(saveAction);

export default save;
