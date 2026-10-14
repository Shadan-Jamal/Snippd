import { program } from "commander";
import chalk from "chalk";
import { input } from "@inquirer/prompts";
import { extractExtensionFromTitle } from "../exts/util.ts";

export const saveInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\n✦  Save a Snippet\n"));

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
