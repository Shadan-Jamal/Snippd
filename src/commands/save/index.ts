import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { createSnippet, createSnippets, FILE_SAVE_LIMIT } from "@/db/queries/snippets.ts";
import { openEditorForInput } from "@/src/utils/editor.ts";
import { extractExtensionFromTitle } from "../exts/util.ts";
import chalk from "chalk";

const save = new Command();

save
    .name("save")
    .description("Save a new snippet, or one snippet per file with --file.")
    .argument("[title]", "Title of the snippet. Omit when using --file.")
    .option("-e, --ext <ext>", "Language extension of the snippet.", "txt")
    .option("-t, --tags <tags...>", "Tags to associate with the snippet.")
    .option("-f, --file <paths...>", "Save each file as its own snippet. Paths may be relative.");

type SaveOptions = { tags?: string[]; ext: string; file?: string[] };

const saveAction = async function (this: Command, title: string | undefined, options: SaveOptions) {
    const parsedTags = options.tags
        ? options.tags.flatMap((tag) => tag.split(",").map((t) => t.trim()).filter(Boolean))
        : [];

    if (options.file?.length) {
        await saveFromFiles(this, title, options.file, parsedTags);
        return;
    }

    if (!title?.trim()) {
        console.log(chalk.red("Title is required. Pass a title, or use --file <paths...>."));
        process.exitCode = 1;
        return;
    }

    const { cleanTitle, extension: titleExtension } = extractExtensionFromTitle(title);

    let finalExtension = options.ext;
    if (titleExtension) {
        if (options.ext !== "txt" && options.ext !== titleExtension) {
            console.log(chalk.yellow(`⚠ Warning: Two extensions provided. Using extension from title "${titleExtension}" and ignoring --ext flag "${options.ext}".`));
        }
        finalExtension = titleExtension;
    }

    console.log(`Saving snippet to ${chalk.blueBright(cleanTitle)}`);
    if (parsedTags.length && finalExtension) {
        console.log(`With tags ${chalk.blueBright(parsedTags.join(","))} and extension .${chalk.blueBright(finalExtension)}`);
    } else if (parsedTags.length) {
        console.log(`With tags ${chalk.blueBright(parsedTags.join(","))}`);
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
            code: snippetContent,
            tags: parsedTags,
        });

        console.log(chalk.green(`Snippet ${snippet.title}.${snippet.extension} saved successfully`));
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("UNIQUE constraint failed: snippets.title")) {
            console.log(chalk.red(`A snippet titled "${cleanTitle}" already exists.`));
            process.exitCode = 1;
            return;
        }
        throw err;
    }
};

function nameFromFilename(filename: string): { title: string; extension: string } {
    const { cleanTitle, extension } = extractExtensionFromTitle(filename);
    return { title: cleanTitle, extension: extension ?? "txt" };
}

function readSnippetFile(filePath: string): { title: string; extension: string; code: string } {
    const resolved = path.resolve(filePath);
    let stat: fs.Stats;
    try {
        stat = fs.statSync(resolved);
    } catch {
        throw new Error(`Cannot read ${filePath}: file not found`);
    }
    if (stat.isDirectory()) {
        throw new Error(`Cannot read ${filePath}: path is a directory`);
    }

    let code: string;
    try {
        code = fs.readFileSync(resolved, "utf8");
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`Cannot read ${filePath}: ${detail}`);
    }
    if (code.includes("\0")) {
        throw new Error(`Cannot read ${filePath}: file is not text`);
    }
    if (!code.trim()) {
        throw new Error(`Cannot read ${filePath}: file is empty`);
    }

    const { title, extension } = nameFromFilename(path.basename(resolved));
    return { title, extension, code };
}

async function saveFromFiles(command: Command, title: string | undefined, files: string[], tags: string[]) {
    if (title?.trim()) {
        console.log(chalk.yellow(`Warning: title "${title.trim()}" is ignored. Each file is saved under its filename.`));
    }
    if (command.getOptionValueSource("ext") === "cli") {
        console.log(chalk.yellow("Warning: --ext is ignored when --file is set. Extension comes from each filename."));
    }
    if (files.length > FILE_SAVE_LIMIT) {
        console.log(chalk.red(`Too many files (${files.length}). The limit is ${FILE_SAVE_LIMIT}.`));
        process.exitCode = 1;
        return;
    }

    const ready: { title: string; extension: string; code: string; tags: string[] }[] = [];
    let failed = 0;

    for (const filePath of files) {
        try {
            ready.push({ ...readSnippetFile(filePath), tags });
        } catch (err) {
            failed += 1;
            console.log(chalk.red(err instanceof Error ? err.message : String(err)));
        }
    }

    if (ready.length > 0) {
        const result = createSnippets(ready);
        for (const snippet of result.created) {
            console.log(chalk.green(`Snippet ${snippet.title}.${snippet.extension} saved successfully`));
        }
        for (const item of result.failed) {
            failed += 1;
            console.log(chalk.red(item.message));
        }
    }

    if (failed > 0) process.exitCode = 1;
}

save.action(saveAction);

export default save;
