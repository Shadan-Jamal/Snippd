import { editor } from "@inquirer/prompts";
import { edit } from "@inquirer/external-editor";
import chalk from "chalk";
import { getConfiguredEditorCommand } from "../config/snippdConfig.ts";

let editorTipShown = false;
let windowsPathTipShown = false;

export function showEditorSetupTip(): void {
    if (editorTipShown || getConfiguredEditorCommand().key) return;
    editorTipShown = true;
    console.log(
        chalk.yellow(
            "Tip: Run `snippd config init` then `snippd config set SNIPPD_VISUAL \"...\"` to persist your editor.\n",
        ),
    );
}

export function showWindowsPathTip(): void {
    if (windowsPathTipShown || process.platform !== "win32") return;

    const { command } = getConfiguredEditorCommand();
    if (!command.toLowerCase().includes("code") || command.includes("\\") || command.includes("/")) return;

    windowsPathTipShown = true;
    console.log(chalk.yellow("Tip: Set SNIPPD_VISUAL to the full quoted path to Code.exe, including --wait.\n"));
}

async function withConfiguredEditor<T>(fn: () => T | Promise<T>): Promise<T> {
    const { command } = getConfiguredEditorCommand();
    const previousVisual = process.env.VISUAL;
    process.env.VISUAL = command;

    try {
        return await fn();
    } finally {
        if (previousVisual === undefined) delete process.env.VISUAL;
        else process.env.VISUAL = previousVisual;
    }
}

function normalizePostfix(extension?: string): string {
    if (!extension) return ".txt";
    const cleaned = extension.replace(/^\./, "");
    return cleaned ? `.${cleaned}` : ".txt";
}

/**
 * Opens the configured editor in a temp file and returns edited content.
 */
export async function openEditorForInput(options?: {
    initialContent?: string;
    extension?: string;
    message?: string;
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
}): Promise<string> {
    showEditorSetupTip();
    showWindowsPathTip();

    return withConfiguredEditor(() =>
        editor({
            message: options?.message ?? "Press Enter to open your editor.",
            default: options?.initialContent ?? "",
            postfix: normalizePostfix(options?.extension),
            waitForUserInput: true,
            validate: options?.validate,
        }),
    );
}

/**
 * Opens a snippet in the configured editor for viewing.
 */
export async function openEditorForView(content: string, extension?: string): Promise<void> {
    showEditorSetupTip();
    showWindowsPathTip();

    await withConfiguredEditor(async () => {
        edit(content, { postfix: normalizePostfix(extension) });
    });
}
