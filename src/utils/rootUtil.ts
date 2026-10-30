import { program } from "commander";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { Commands } from "../types/index.ts";

// ─── Per-command interactive flow imports ────────────────────────────────────
import { saveInteractiveFlow } from "../commands/save/util.ts";
import { searchInteractiveFlow } from "../commands/search/util.ts";
import { editInteractiveFlow } from "../commands/edit/util.ts";
import { recentInteractiveFlow } from "../commands/recent/util.ts";
import { exportInteractiveFlow } from "../commands/export/util.ts";
import { importInteractiveFlow } from "../commands/import/util.ts";
import { containerInteractiveFlow } from "../commands/container/util.ts";
import { tagsInteractiveFlow } from "../commands/tags/util.ts";
import { aiInteractiveFlow } from "../commands/ai/util.ts";
import { configInteractiveFlow } from "../commands/config/util.ts";

export const parseAsyncArgs = ["node", "yarn dev -- "];


export const showWelcomeMenu = async (): Promise<void> => {
    console.clear();
    
    console.log(chalk.cyan.bold(`
    █▀▀ █▀█ ▀█▀ █▀█ █▀█ █▀▄
    ▀▀█ █ █  █  █▀▀ █▀▀ █ █
    ▀▀▀ ▀ ▀ ▀▀▀ ▀   ▀   ▀▀
    `));

    console.log(chalk.dim("Your local code snippet manager.\n"));

    const choice = await select<Commands>({
        message: chalk.bold("What would you like to do?"),
        pageSize: 8,
        choices: [
            { name: `${chalk.green("✦")}  Save a snippet`, value: "save" },
            { name: `${chalk.blue("◉")}  View a snippet`, value: "view" },
            { name: `${chalk.yellow("⌕")}  Search snippets`, value: "search" },
            { name: `${chalk.magenta("✦")}  AI search`, value: "ai" },
            { name: `${chalk.cyan("≡")}  List all snippets`, value: "list" },
            { name: `${chalk.cyan("⏱")}  Recent snippets`, value: "recent" },
            { name: `${chalk.blue("✎")}  Edit a snippet`, value: "edit" },
            { name: `${chalk.green("⎘")}  Copy snippet to clipboard`, value: "copy" },
            { name: `${chalk.red("✗")}  Delete a snippet`, value: "delete" },
            { name: `${chalk.yellow("⌂")}  Manage tags`, value: "tags" },
            { name: `${chalk.blue("▦")}  Manage containers`, value: "container" },
            { name: `${chalk.dim("⚙")}  Show / edit config`, value: "config" },
            { name: `${chalk.dim("🩺")} Doctor — check setup`, value: "doctor" },
            { name: `${chalk.dim("⬡")}  Browse extensions`, value: "exts" },
            { name: `${chalk.dim("↑")}  Import snippets`, value: "import" },
            { name: `${chalk.dim("↓")}  Export snippets`, value: "export" },
            { name: `${chalk.dim("◫")}  Open UI`, value: "ui" },
            { name: chalk.dim("  Exit"), value: "exit" },
        ],
    });

    if (choice === "exit") {
        console.log(chalk.dim("\nExiting...\n"));
        process.exit(0);
    }

    await interactiveFlow(choice, { fromWelcome: true });
};

// Dispatches to the per-command flow function living in that command's util.ts.
// Commands that already have a built-in interactive picker when called with no
// args (view, copy, delete, list, exts) are dispatched to commander directly.
// Commands that never need input (doctor, ui) are also dispatched directly.
//
// "Back to menu" is only offered when the user arrived from the welcome menu.
// Bare CLI invocations like `snippd tags` omit Back.

export const interactiveFlow = async (
    command: Commands,
    options?: { fromWelcome?: boolean },
): Promise<void> => {
    const back = options?.fromWelcome ? () => showWelcomeMenu() : undefined;

    switch (command) {
        case "save":
            await saveInteractiveFlow(parseAsyncArgs);
            break;

        case "search":
            await searchInteractiveFlow(parseAsyncArgs);
            break;

        case "edit":
            await editInteractiveFlow(parseAsyncArgs);
            break;

        case "recent":
            await recentInteractiveFlow(parseAsyncArgs);
            break;

        case "export":
            await exportInteractiveFlow(parseAsyncArgs);
            break;

        case "import":
            await importInteractiveFlow(parseAsyncArgs);
            break;

        case "container":
            await containerInteractiveFlow(parseAsyncArgs, back);
            break;

        case "tags":
            await tagsInteractiveFlow(parseAsyncArgs, back);
            break;

        case "ai":
            await aiInteractiveFlow(parseAsyncArgs, back);
            break;

        case "config":
            await configInteractiveFlow(parseAsyncArgs, back);
            break;

        // Commands with built-in pickers — dispatch directly
        case "view":
        case "copy":
        case "delete":
        case "list":
        case "exts":
        // No interactive input needed
        case "doctor":
        case "ui":
        default:
            await program.parseAsync([...parseAsyncArgs, command]);
            break;
    }
};