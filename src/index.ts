import { program } from "commander";
import save from "./commands/save/index.ts"
import search from "./commands/search/index.ts";
import deleteCmd from "./commands/delete/index.ts";
import list from "./commands/list/index.ts";
import recent from "./commands/recent/index.ts";
import exts from "./commands/exts/index.ts";
import config from "./commands/config/index.ts";
import doctor from "./commands/doctor/index.ts";
import ui from "./commands/ui/index.ts";
import exportCmd from "./commands/export/index.ts";
import importCmd from "./commands/import/index.ts";
import containers from "./commands/containers/index.ts";
import tags from "./commands/tags/index.ts";
import edit from "./commands/edit/index.ts";
import copy from "./commands/copy/index.ts";
import view from "./commands/view/index.ts";
import ai from "./commands/ai/index.ts";
import { showWelcomeMenu, interactiveFlow } from "./utils/rootUtil.ts";
import type { Commands } from "./types/index.ts";

/** Inquirer Ctrl+C / Esc cancel — exit quietly (no stack dump). */
function isUserCancel(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const name = (err as { name?: string }).name;
    return name === "ExitPromptError"
        || name === "AbortPromptError"
        || name === "CancelPromptError";
}

function exitQuietly(code = 130): never {
    process.exit(code);
}

process.on("uncaughtException", (err) => {
    if (isUserCancel(err)) exitQuietly();
    throw err;
});

process.on("unhandledRejection", (reason) => {
    if (isUserCancel(reason)) exitQuietly();
    console.error(reason);
    process.exitCode = 1;
});

program.addCommand(save);
program.addCommand(search);
program.addCommand(deleteCmd);
program.addCommand(list);
program.addCommand(recent);
program.addCommand(exts);
program.addCommand(config);
program.addCommand(doctor);
program.addCommand(ui);
program.addCommand(exportCmd);
program.addCommand(importCmd);
program.addCommand(containers);
program.addCommand(tags);
program.addCommand(edit);
program.addCommand(copy);
program.addCommand(view);
program.addCommand(ai);

const rawArgs = process.argv.slice(2);
const isRootInvocation = rawArgs.length === 0;

// Commands that require a required <arg>.
const bareCommandInterceptors = new Set<Commands>([
    "save",    // requires <title>
    "search",  // requires <query>
    "edit",    // optional title — picker when omitted
    "import",  // requires <file>
    "recent",  // optional args but nicer to prompt
    "export",  // optional path but nicer to prompt
    "containers", // subcommands — sub-menu
    "tags",    // sub-menu for rename/delete
    "ai",      // sub-menu (requires <query> for default action)
    "config",  // sub-menu
]);

try {
    if (isRootInvocation) {
        await showWelcomeMenu();
    } else {
        const firstArg = rawArgs[0] as Commands;
        const isBareCommand = bareCommandInterceptors.has(firstArg) && rawArgs.length === 1;

        if (isBareCommand) {
            // Bare CLI entry (e.g. `snippd tags`) — no Back to welcome menu
            await interactiveFlow(firstArg);
        } else {
            await program.parseAsync();
        }
    }
} catch (err) {
    if (isUserCancel(err)) exitQuietly();
    throw err;
}
