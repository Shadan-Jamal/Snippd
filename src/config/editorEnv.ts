import chalk from "chalk";
import { configAppliedKeys, type ConfigEnvKey } from "./snippdConfig.ts";

export type EditorSource = "SNIPPD_EDITOR" | "VISUAL" | "EDITOR" | "config" | "fallback";

const GUI_EDITOR_HINTS = ["code", "cursor", "subl", "antigravity", "zed", "windsurf"];

export function getPlatformFallback(): string {
    return process.platform === "win32" ? "notepad" : "vim";
}

function getSourceForKey(key: ConfigEnvKey): EditorSource {
    return configAppliedKeys.has(key) ? "config" : key;
}

export function getEffectiveEditorCommand(): { command: string; source: EditorSource } {
    const snippdEditor = process.env.SNIPPD_EDITOR?.trim();
    if (snippdEditor) {
        return { command: snippdEditor, source: getSourceForKey("SNIPPD_EDITOR") };
    }

    const visual = process.env.VISUAL?.trim();
    if (visual) {
        return { command: visual, source: getSourceForKey("VISUAL") };
    }

    const editor = process.env.EDITOR?.trim();
    if (editor) {
        return { command: editor, source: getSourceForKey("EDITOR") };
    }

    return { command: getPlatformFallback(), source: "fallback" };
}

export function isEditorExplicitlyConfigured(): boolean {
    return !!(
        process.env.SNIPPD_EDITOR?.trim() ||
        process.env.VISUAL?.trim() ||
        process.env.EDITOR?.trim()
    );
}

/**
 * Inject the effective editor as VISUAL for @inquirer/external-editor.
 */
export async function withResolvedEditorEnv<T>(fn: () => T | Promise<T>): Promise<T> {
    const { command } = getEffectiveEditorCommand();

    const previousVisual = process.env.VISUAL;
    process.env.VISUAL = command;

    try {
        return await fn();
    } finally {
        if (previousVisual === undefined) {
            delete process.env.VISUAL;
        } else {
            process.env.VISUAL = previousVisual;
        }
    }
}

function getEditorBin(command: string): string {
    const trimmed = command.trim();
    if (trimmed.startsWith('"')) {
        const closeQuote = trimmed.indexOf('"', 1);
        if (closeQuote === -1) return trimmed.slice(1);
        return trimmed.slice(1, closeQuote);
    }

    const space = trimmed.indexOf(" ");
    return space === -1 ? trimmed : trimmed.slice(0, space);
}

export function looksLikeGuiEditor(command: string): boolean {
    const bin = getEditorBin(command).replace(/^"|"$/g, "").toLowerCase();
    const base = bin.split(/[/\\]/).pop() ?? bin;
    return GUI_EDITOR_HINTS.some((name) => base === name || base === `${name}.exe`);
}

export function hasWaitFlag(command: string): boolean {
    return /\s--wait(\s|$)/.test(command) || command.includes('"--wait"');
}

export function usesWindowsShorthand(command: string): boolean {
    if (process.platform !== "win32") return false;

    const bin = getEditorBin(command).replace(/^"|"$/g, "");
    if (/\.exe$/i.test(bin)) return false;
    if (bin.includes("\\") || bin.includes("/")) return false;

    return looksLikeGuiEditor(command);
}

export function getWindowsEditorPathTip(): string {
    return [
        "On Windows, use the full path to the .exe in ~/.snippd/config.json (not the code CLI shim).",
        'Example: snippd config set visual "\\"C:\\\\path\\\\code.exe\\" --wait"',
    ].join(" ");
}

export function formatEditorSource(source: EditorSource): string {
    if (source === "config") return "config.json";
    return source;
}

export function printEditorSetupInstructions(): void {
    console.log(chalk.cyan("\n📝 Editor setup\n"));
    console.log(
        "Snippd reads editor settings from ~/.snippd/config.json (persisted) and shell env vars (session override).",
    );
    console.log("GUI editors must include --wait so Snippd waits until you close the file.\n");

    console.log(chalk.bold("1. Create the config file:"));
    console.log(chalk.green("  snippd config init\n"));

    console.log(chalk.bold("2. Set your editor (persisted):"));
    if (process.platform === "win32") {
        console.log(
            chalk.green(
                '  snippd config set visual "\\"C:\\\\path\\\\code.exe\\" --wait"',
            ),
        );
    } else {
        console.log(chalk.green('  snippd config set visual "code --wait"'));
        console.log(chalk.green('  snippd config set editor "vim"'));
    }
    console.log();

    console.log(chalk.bold("Or edit ~/.snippd/config.json directly:"));
    if (process.platform === "win32") {
        console.log(
            chalk.dim(`  {
            "visual": "\\"C:\\\\path\\\\code.exe\\" --wait"
            }`),
        );
    } else {
        console.log(
            chalk.dim(`  {
            "visual": "code --wait",
            "editor": "vim"
            }`),
        );
    }
    console.log();

    console.log(chalk.bold("Optional session override (higher priority than config.json):"));
    if (process.platform === "win32") {
        console.log(
            chalk.dim('  $env:VISUAL = "`"$env:LOCALAPPDATA\\\\Programs\\\\code.exe`" --wait"'),
        );
    } else {
        console.log(chalk.dim('  export VISUAL="code --wait"'));
    }
    console.log();

    const { command, source } = getEffectiveEditorCommand();
    console.log(chalk.bold("Currently active:"));
    console.log(`  ${command} ${chalk.dim(`(via ${formatEditorSource(source)})`)}\n`);
}

export interface EditorCheckResult {
    ok: boolean;
    warnings: string[];
    errors: string[];
}

export function checkEditorEnvironment(): EditorCheckResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const { command, source } = getEffectiveEditorCommand();

    if (source === "fallback") {
        warnings.push(
            `No editor configured. Run \`snippd config init\` then \`snippd config set visual "..."\`. Using fallback: ${command}`,
        );
    }

    if (looksLikeGuiEditor(command) && !hasWaitFlag(command)) {
        warnings.push(
            `Editor "${command}" looks like a GUI editor but is missing --wait. Snippd may return before you finish editing.`,
        );
    }

    if (source === "EDITOR" && looksLikeGuiEditor(command)) {
        warnings.push(
            "EDITOR is usually for terminal editors (vim, nano). Consider moving GUI editors to VISUAL instead.",
        );
    }

    if (usesWindowsShorthand(command)) {
        warnings.push(getWindowsEditorPathTip());
    }

    return {
        ok: errors.length === 0,
        warnings,
        errors,
    };
}
