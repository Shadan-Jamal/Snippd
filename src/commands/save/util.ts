import { program } from "commander";
import chalk from "chalk";
import { checkbox, input, select } from "@inquirer/prompts";
import { extractExtensionFromTitle } from "../exts/util.ts";

export const saveInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\n✦  Save a Snippet\n"));

    const mode = await select({
        message: "How do you want to save?",
        choices: [
            { name: "Write in your editor", value: "editor" },
            { name: "Save from files", value: "files" },
        ],
    });

    if (mode === "files") {
        await saveFilesInteractive(parseAsyncArgs);
        return;
    }

    const title = await input({
        message: "Snippet title (e.g. parse-jwt.ts):",
        validate: (v) => v.trim().length > 0 || "Title cannot be empty.",
    });

    const { extension: titleExt } = extractExtensionFromTitle(title);
    let ext: string;
    if(titleExt){
        ext = titleExt;
        console.log(`Using ${chalk.blue(titleExt)} as extension`);
    }
    else{
        ext = await input({
            message: "Language extension (default: txt):",
            default: "txt",
        });
    }

    const tagsRaw = await input({
        message: "Tags (comma-separated, optional):",
        default: "",
    });

    const args = [...parseAsyncArgs, "save", title.trim(), "--ext", ext.trim()];
    if (tagsRaw.trim()) {
        const tagList = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
        args.push("--tags", ...tagList);
    }
    await program.parseAsync(args);
};

async function saveFilesInteractive(parseAsyncArgs: string[]): Promise<void> {
    const paths: string[] = [];

    const first = await input({
        message: "File path:",
        validate: (v) => v.trim().length > 0 || "Path cannot be empty.",
    });
    paths.push(first.trim());

    while (true) {
        console.clear();
        console.log(chalk.cyan("\n✦  Save from files\n"));
        paths.forEach((filePath, index) => {
            console.log(`  ${index + 1}. ${filePath}`);
        });
        console.log();

        const action = await select({
            message: "What do you want to do?",
            choices: [
                { name: "Add another path", value: "add" },
                { name: "Remove", value: "remove", disabled: paths.length === 0 },
                { name: "Save", value: "save", disabled: paths.length === 0 },
                { name: chalk.red("Cancel"), value: "cancel" },
            ],
        });

        if (action === "cancel") return;

        if (action === "remove") {
            const selected = await checkbox<number>({
                message: "Select paths to remove",
                choices: paths.map((filePath, index) => ({
                    name: filePath,
                    value: index,
                })),
            });
            const drop = new Set(selected);
            const remaining = paths.filter((_, index) => !drop.has(index));
            paths.length = 0;
            paths.push(...remaining);
            if (paths.length === 0) {
                const again = await input({
                    message: "File path:",
                    validate: (v) => v.trim().length > 0 || "Path cannot be empty.",
                });
                paths.push(again.trim());
            }
            continue;
        }

        if (action === "add") {
            const filePath = await input({
                message: "File path:",
                validate: (v) => v.trim().length > 0 || "Path cannot be empty.",
            });
            paths.push(filePath.trim());
            continue;
        }

        const tagsRaw = await input({
            message: "Tags for every file (comma-separated, optional):",
            default: "",
        });
        const args = [...parseAsyncArgs, "save", "--file", ...paths];
        if (tagsRaw.trim()) {
            const tagList = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
            args.push("--tags", ...tagList);
        }
        await program.parseAsync(args);
        return;
    }
}
