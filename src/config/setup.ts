import { select, input } from "@inquirer/prompts";
import chalk from "chalk";
import { setConfig } from "./index.ts";
import { knownEditors, resolveEditorPath } from "./editors.ts";
import which from "which";

export async function runSetup(): Promise<void> {
    console.log(chalk.cyan("\n🔧 Welcome to Snippd! Let's configure your editor.\n"));

    const availableWithPaths = knownEditors
        .filter(e => e.platforms.includes(process.platform))
        .map(e => ({ editor: e, resolvedPath: resolveEditorPath(e) }))
        .filter((e): e is { editor: typeof e.editor; resolvedPath: string } => e.resolvedPath !== null);

    const choices: { name: string; value: string }[] = [
        ...availableWithPaths.map(({ editor }) => ({ name: chalk.green(editor.name), value: editor.name })),
        { name: "System Default", value: "__system__" },
        { name: chalk.yellow("Custom (enter command manually)"), value: "__custom__" },
    ];

    const selection = await select({
        message: "Which editor would you like to use?",
        choices,
    });

    let editorConfig;

    if (selection === "__system__") {
        const fallback = process.platform === "win32" ? "notepad" : "vi";
        const command = process.env.EDITOR || process.env.VISUAL || fallback;
        const resolvedCommand = which.sync(command, { nothrow: true }) ?? command;
        editorConfig = {
            name: "System Default",
            command,
            resolvedCommand,
        };
    } else if (selection === "__custom__") {
        const cmd = await input({
            message: "Enter the editor command (e.g., 'subl', 'micro', 'kate'):",
            validate: (val) => val.trim().length > 0 || "Command cannot be empty.",
        });

        const needsWait = await select({
            message: "Is this a GUI editor? (GUI editors need a --wait flag so Snippd waits for you to finish editing)",
            choices: [
                { name: "Yes (GUI editor like VS Code, Sublime)", value: true },
                { name: "No (terminal editor like vim, nano)", value: false },
            ],
        });

        const resolvedCommand = which.sync(cmd.trim(), { nothrow: true }) ?? cmd.trim();
        if (!which.sync(cmd.trim(), { nothrow: true })) {
            console.log(chalk.yellow(`⚠  Could not resolve '${cmd.trim()}' in PATH. It will be used as-is.`));
        }

        editorConfig = {
            name: "Custom",
            command: cmd.trim(),
            resolvedCommand,
            args: needsWait ? ["--wait"] : [],
            readOnlyArgs: needsWait ? ["--wait"] : [],
        };
    } else {
        // A known editor was selected — use its stored resolved path
        const found = availableWithPaths.find(({ editor }) => editor.name === selection)!;
        editorConfig = {
            name: found.editor.name,
            command: found.editor.command,
            resolvedCommand: found.resolvedPath,
            args: found.editor.args,
            readOnlyArgs: found.editor.readOnlyArgs,
        };
    }

    setConfig({ editor: editorConfig });
    console.log(chalk.green(`\n✅ Editor set to: ${editorConfig.name} (${editorConfig.command})\n`));
}
