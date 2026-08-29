import { Command } from "commander";
import { createSnippet } from "../../db/queries/snippets.ts";
import { openEditorForInput } from "../utils/editor.ts";
import chalk from "chalk";

const save = new Command();

save
    .name("save")
    .description("Save a new snippet.")
    .argument("<title>", "Title of the Snippet")
    .option("-e, --ext <ext>", "Language extension of the snippet.", "txt")
    .option("-t, --tags <tags...>", "Tags to associate with the snippet.");

const saveAction = async (title: string, options: { tags?: string[]; ext: string }) => {
    console.log(`Saving snippet to ${chalk.blueBright(title)}`);
    if (options.tags?.length && options.ext) {
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))} and extension .${chalk.blueBright(options.ext)}`);
    } else if (options.tags?.length) {
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))}`);
    } else if (options.ext) {
        console.log(`With extension .${chalk.blueBright(options.ext)}`);
    }

    const snippetContent = await openEditorForInput({
        extension: options.ext,
        message: `Editing snippet "${title}"`,
        validate: (value) => value.trim().length > 0 || "Snippet cannot be empty.",
    });

    try {
        const snippet = createSnippet({
            title,
            extension: options.ext,
            snippet: snippetContent,
            tags: options.tags,
        });

        console.log(chalk.green("Snippet saved successfully"));
        console.log("Snippet:", snippet);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("UNIQUE constraint failed: snippets.title")) {
            console.log(chalk.red(`A snippet titled "${title}" already exists.`));
            return;
        }
        throw err;
    }
};

save.action(saveAction);

export default save;
