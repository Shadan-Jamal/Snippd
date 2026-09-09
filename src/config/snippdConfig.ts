import fs from "node:fs";
import path from "node:path";
import { config as paths } from "../utils/config.ts";

export const CONFIG_FILE = path.join(paths.dataDir, "config.json");

export type ConfigKey = "SNIPPD_VISUAL" | "SNIPPD_EDITOR";

export interface SnippdConfig {
    SNIPPD_VISUAL?: string;
    SNIPPD_EDITOR?: string;
}

export interface ConfigCheckResult {
    errors: string[];
    warnings: string[];
}

const CONFIG_KEYS: Record<string, ConfigKey> = {
    snippd_visual: "SNIPPD_VISUAL",
    snippd_editor: "SNIPPD_EDITOR",
};

export function normalizeConfigKey(key: string): ConfigKey | null {
    return CONFIG_KEYS[key.trim().toLowerCase()] ?? null;
}

export function configFileExists(): boolean {
    return fs.existsSync(CONFIG_FILE);
}

export function checkConfig(): boolean {
    if(!configFileExists()){
        return false;
    }

    try {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw) as SnippdConfig;
        if (typeof parsed !== "object" || parsed === null) return false;
        return true;
    } catch {
        return false;
    }
}

export function readConfigFile(): SnippdConfig {
    if (!configFileExists()) return {};

    try {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw) as SnippdConfig;
        return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

export function writeConfigFile(configData: SnippdConfig): void {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2) + "\n", "utf-8");
}

export function initConfigFile(): boolean {
    if (configFileExists()) return false;

    writeConfigFile({
        SNIPPD_VISUAL: "",
        SNIPPD_EDITOR: "",
    });
    return true;
}

export function getConfiguredEditorCommand(): { command: string; key: ConfigKey | null } {
    const fileConfig = readConfigFile();
    for (const key of ["SNIPPD_VISUAL", "SNIPPD_EDITOR"] as ConfigKey[]) {
        const command = typeof fileConfig[key] === "string" ? fileConfig[key].trim() : "";
        if (command) return { command, key };
    }

    return { command: process.platform === "win32" ? "notepad" : "vim", key: null };
}

function parseEditorCommand(command: string): { executable: string; args: string[]; quoted: boolean; unmatchedQuote: boolean } {
    const trimmed = command.trim();
    if (!trimmed) return { executable: "", args: [], quoted: false, unmatchedQuote: false };

    if (trimmed.startsWith('"')) {
        const closingQuote = trimmed.indexOf('"', 1);
        if (closingQuote === -1) {
            return { executable: trimmed.slice(1), args: [], quoted: true, unmatchedQuote: true };
        }

        const executable = trimmed.slice(1, closingQuote);
        const rest = trimmed.slice(closingQuote + 1).trim();
        return { executable, args: rest ? rest.split(/\s+/) : [], quoted: true, unmatchedQuote: false };
    }

    const [executable, ...args] = trimmed.split(/\s+/);
    return { executable, args, quoted: false, unmatchedQuote: false };
}

function isGuiEditor(executable: string): boolean {
    const basename = path.basename(executable).toLowerCase();
    return ["code", "code.exe", "cursor", "cursor.exe", "subl", "subl.exe", "zed", "zed.exe", "windsurf", "windsurf.exe"]
        .includes(basename);
}

export function checkEditorConfig(): ConfigCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fileConfig = readConfigFile();
    const configuredKeys = ["SNIPPD_VISUAL", "SNIPPD_EDITOR"] as ConfigKey[];
    const commands = configuredKeys.map((key) => ({ key, value: fileConfig[key] }));

    for (const { key, value } of commands) {
        if (value === undefined) continue;
        if (typeof value !== "string") {
            errors.push(`${key} must be a string command.`);
            continue;
        }

        if (value.trim() === "") continue;

        const parsed = parseEditorCommand(value);
        if (parsed.unmatchedQuote) {
            errors.push(`${key} has an opening quote without a closing quote around the executable path.`);
            continue;
        }

        if (!parsed.executable) {
            errors.push(`${key} is empty.`);
            continue;
        }

        if (process.platform === "win32" && /[\\/ ]/.test(parsed.executable) && !parsed.quoted) {
            errors.push(`${key} contains a path with spaces that is not enclosed in quotes: ${parsed.executable}.
            Try enclosing the path in quotes.
            Example: "${key} = "\\"C:\\Path\\To\\Your\\Editor\\executable.exe\\"" --wait"
            `);
        }

        if (process.platform === "win32" && (/\.(cmd|bat)$/i.test(parsed.executable) || !/\.(exe)$/i.test(parsed.executable))) {
            warnings.push(`${key} points to a shell shim (${parsed.executable}). Use the actual .exe file instead.`);
        }

        if (path.isAbsolute(parsed.executable) && !fs.existsSync(parsed.executable)) {
            errors.push(`${key} executable does not exist: ${parsed.executable}`);
        }

        const args = parsed.args.map((arg) => arg.replace(/^['"]|['"]$/g, ""));
        if (isGuiEditor(parsed.executable) && !args.includes("--wait")) {
            warnings.push(`${key} uses a GUI editor without --wait. Snippd may read or delete the temporary file too early.`);
        }

        if (key === "SNIPPD_EDITOR" && isGuiEditor(parsed.executable)) {
            warnings.push(`${key} is intended for terminal/TUI editors such as vim or neovim; use SNIPPD_VISUAL for GUI editors.`);
        }
    }

    if (!commands.some(({ value }) => typeof value === "string" && value.trim())) {
        warnings.push(`Neither SNIPPD_VISUAL nor SNIPPD_EDITOR is configured properly; Snippd will use the platform fallback. Check ${CONFIG_FILE}`);
    }

    return { errors, warnings };
}

export function setConfigKey(key: ConfigKey, value: string): void {
    const fileConfig = readConfigFile();
    fileConfig[key] = value.trim();
    writeConfigFile(fileConfig);
}

export function getConfigValuesForDisplay(): Partial<Record<ConfigKey, string>> {
    const fileConfig = readConfigFile();
    const result: Partial<Record<ConfigKey, string>> = {};

    for (const key of ["SNIPPD_VISUAL", "SNIPPD_EDITOR"] as ConfigKey[]) {
        const value = fileConfig[key]?.trim();
        if (value) result[key] = value;
    }

    return result;
}
