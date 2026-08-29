import { editor } from "@inquirer/prompts";
import { edit } from "@inquirer/external-editor";
import chalk from "chalk";
import {
    getWindowsEditorPathTip,
    isEditorExplicitlyConfigured,
    usesWindowsShorthand,
    withResolvedEditorEnv,
    getEffectiveEditorCommand,
} from "../config/editorEnv.ts";

let editorTipShown = false;
let windowsPathTipShown = false;

function showEditorSetupTip(): void {
    if (editorTipShown || isEditorExplicitlyConfigured()) return;
    editorTipShown = true;
    console.log(
        chalk.yellow(
            "Tip: Run `snippd config init` then `snippd config set visual \"...\"` to persist your editor.\n",
        ),
    );
}

function showWindowsPathTip(): void {
    if (windowsPathTipShown || process.platform !== "win32") return;

    const { command } = getEffectiveEditorCommand();
    if (!usesWindowsShorthand(command)) return;

    windowsPathTipShown = true;
    console.log(chalk.yellow(`Tip: ${getWindowsEditorPathTip()}\n`));
}

function normalizePostfix(extension?: string): string {
    if (!extension) return ".txt";
    const cleaned = extension.replace(/^\./, "");
    return cleaned ? `.${cleaned}` : ".txt";
}

/**
 * Opens the user's VISUAL/EDITOR in a temp file and returns edited content.
 */
export async function openEditorForInput(options?: {
    initialContent?: string;
    extension?: string;
    message?: string;
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
}): Promise<string> {
    showEditorSetupTip();
    showWindowsPathTip();

    return withResolvedEditorEnv(() =>
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
 * Opens a snippet in the user's VISUAL/EDITOR for viewing.
 */
export async function openEditorForView(content: string, extension?: string): Promise<void> {
    showEditorSetupTip();
    showWindowsPathTip();

    await withResolvedEditorEnv(async () => {
        edit(content, { postfix: normalizePostfix(extension) });
    });
}
