import fs from "node:fs";
import path from "node:path";
import { config as paths } from "../utils/config.ts";
import { ConfigCheckResult, ConfigKey, EditorConfigKey, SavedEditors, SnippdConfig } from "../types/index.ts";

export const CONFIG_KEYS: Record<string, ConfigKey> = {
    snippd_gui: "SNIPPD_GUI",
    snippd_tui: "SNIPPD_TUI",
    current_editor: "CURRENT_EDITOR",
    ollama_api_url: "OLLAMA_API_URL",
    ollama_model: "OLLAMA_MODEL"
};

export const CONFIG_FILE = path.join(paths.dataDir, "config.json");

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
        SNIPPD_GUI: "",
        SNIPPD_TUI: "",
        CURRENT_EDITOR: "",
        OLLAMA_API_URL: "",
        OLLAMA_MODEL: "",
        EDITORS: {},
    });
    return true;
}

export function getCurrentEditorKey(): EditorConfigKey {
    const fileConfig = readConfigFile();
    if (fileConfig.CURRENT_EDITOR === "SNIPPD_GUI" || fileConfig.CURRENT_EDITOR === "SNIPPD_TUI") {
        return fileConfig.CURRENT_EDITOR;
    }

    if (fileConfig.SNIPPD_GUI?.trim()) return "SNIPPD_GUI";
    if (fileConfig.SNIPPD_TUI?.trim()) return "SNIPPD_TUI";
    return "SNIPPD_GUI";
}

export function getConfiguredEditorCommand(): { command: string; key: EditorConfigKey | null } {
    const key = getCurrentEditorKey();
    const configuredCommand = readConfigFile()[key];
    const command = typeof configuredCommand === "string" ? configuredCommand.trim() : "";
    if (command) return { command, key };

    return { command: process.platform === "win32" ? "notepad" : "vim", key: null };
}

export function parseEditorCommand(command: string): { executable: string; args: string[]; quoted: boolean; unmatchedQuote: boolean; inferredExePath: boolean } {
    const trimmed = command.trim();
    if (!trimmed) return { executable: "", args: [], quoted: false, unmatchedQuote: false, inferredExePath: false };

    if (trimmed.startsWith('"')) {
        const closingQuote = trimmed.indexOf('"', 1);
        if (closingQuote === -1) {
            return { executable: trimmed.slice(1), args: [], quoted: true, unmatchedQuote: true, inferredExePath: false };
        }

        const executable = trimmed.slice(1, closingQuote);
        const rest = trimmed.slice(closingQuote + 1).trim();
        return { executable, args: rest ? rest.split(/\s+/) : [], quoted: true, unmatchedQuote: false, inferredExePath: false };
    }

    const exeMatch = trimmed.match(/^(.+?\.exe)(?=\s|$)(?:\s+(.*))?$/i);
    if (exeMatch) {
        const [, executable, rawArgs = ""] = exeMatch;
        if (executable) {
            return {
                executable,
                args: rawArgs ? rawArgs.split(/\s+/) : [],
                quoted: false,
                unmatchedQuote: false,
                inferredExePath: true,
            };
        }
    }

    const [executable, ...args] = trimmed.split(/\s+/);
    return { executable, args, quoted: false, unmatchedQuote: false, inferredExePath: false };
}

export function getEditorPathKind(command: string): string {
    const { executable } = parseEditorCommand(command);
    if (!executable) return "unknown";

    const basename = path.basename(executable);
    if (/\.(cmd|bat)$/i.test(executable)) return "shim";

    const hasPathSep = /[\\/]/.test(executable);
    if (process.platform === "win32" && !hasPathSep && !/\.exe$/i.test(executable)) {
        return "shim";
    }

    return basename;
}

export function getSavedEditors(): SavedEditors {
    const editors = readConfigFile().EDITORS;
    if (!editors || typeof editors !== "object" || Array.isArray(editors)) return {};

    const result: SavedEditors = {};
    for (const [alias, command] of Object.entries(editors)) {
        if (typeof command === "string" && command.trim()) {
            result[alias] = command.trim();
        }
    }
    return result;
}

function normalizeEditorCommandValue(value: string, role: EditorConfigKey = "SNIPPD_GUI"): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (role === "SNIPPD_TUI") return trimmed;

    if (trimmed.includes("--wait")) {
        const parts = trimmed.split("--wait");
        const pathPart = parts[0]!.trim().replace(/^["']/, "").replace(/["']$/, "");
        return `"${pathPart}" --wait`;
    }

    const parsed = parseEditorCommand(trimmed);
    const isGui = isGuiEditor(parsed.executable);
    if (isGui || path.isAbsolute(parsed.executable) || /\.exe$/i.test(parsed.executable)) {
        const pathPart = parsed.executable;
        const extraArgs = parsed.args.filter((a) => a !== "--wait");
        const argsSuffix = extraArgs.length ? ` ${extraArgs.join(" ")}` : "";
        return `"${pathPart}"${argsSuffix} --wait`;
    }

    return trimmed;
}

export function setSavedEditor(alias: string, command: string, role: EditorConfigKey = "SNIPPD_GUI"): void {
    const key = alias.trim();
    if (!key) throw new Error("Editor alias cannot be empty.");

    const normalized = normalizeEditorCommandValue(command, role);
    if (!normalized) throw new Error("Editor path cannot be empty.");

    const fileConfig = readConfigFile();
    fileConfig.EDITORS = { ...getSavedEditors(), [key]: normalized };
    writeConfigFile(fileConfig);
}

export function removeSavedEditor(alias: string): boolean {
    const fileConfig = readConfigFile();
    const editors = { ...getSavedEditors() };
    if (!(alias in editors)) return false;
    delete editors[alias];
    fileConfig.EDITORS = editors;
    writeConfigFile(fileConfig);
    return true;
}

//TODO Remove
function isGuiEditor(executable: string): boolean {
    const basename = path.basename(executable).toLowerCase();
    return ["code", "code.exe", "cursor", "cursor.exe", "subl", "subl.exe", "zed", "zed.exe", "windsurf", "windsurf.exe"]
        .includes(basename);
}

export function checkEditorConfig(): ConfigCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fileConfig = readConfigFile();
    if (
        fileConfig.CURRENT_EDITOR !== undefined &&
        fileConfig.CURRENT_EDITOR !== "" &&
        fileConfig.CURRENT_EDITOR !== "SNIPPD_GUI" &&
        fileConfig.CURRENT_EDITOR !== "SNIPPD_TUI"
    ) {
        errors.push("CURRENT_EDITOR must be SNIPPD_GUI or SNIPPD_TUI.");
    }

    const configuredKeys: EditorConfigKey[] = ["SNIPPD_GUI", "SNIPPD_TUI"];
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

        if (process.platform === "win32" && /[\\/ ]/.test(parsed.executable) && !parsed.quoted && !parsed.inferredExePath) {
            errors.push(`${key} contains a path with spaces that is not enclosed in quotes: ${parsed.executable}.
            Try enclosing the path in quotes.
            Example: "${key} = "\\"C:\\Path\\To\\Your\\Editor\\executable.exe\\"" --wait"
            `);
        }

        if (process.platform === "win32" && /\.(cmd|bat)$/i.test(parsed.executable)) {
            warnings.push(`${key} points to a shell shim (${parsed.executable}). Use the actual .exe file instead.`);
        }

        if (path.isAbsolute(parsed.executable) && !fs.existsSync(parsed.executable)) {
            errors.push(`${key} executable does not exist: ${parsed.executable}`);
        }

        const args = parsed.args.map((arg) => arg.replace(/^['"]|['"]$/g, ""));
        if (isGuiEditor(parsed.executable) && !args.includes("--wait")) {
            warnings.push(`${key} uses a GUI editor without --wait. Snippd may read or delete the temporary file too early.`);
        }

        if (key === "SNIPPD_TUI" && isGuiEditor(parsed.executable)) {
            warnings.push(`${key} is intended for terminal/TUI editors such as vim or neovim; use SNIPPD_GUI for GUI editors.`);
        }
    }

    if (!commands.some(({ value }) => typeof value === "string" && value.trim())) {
        warnings.push(`Neither SNIPPD_GUI nor SNIPPD_TUI is configured properly; Snippd will use the platform fallback. Check ${CONFIG_FILE}`);
    }

    return { errors, warnings };
}

export function setConfigKey(key: ConfigKey, value: string): void {
    const fileConfig = readConfigFile();
    const trimmed = value.trim();
    
    if (key === "SNIPPD_TUI" || key === "SNIPPD_GUI") {
        fileConfig[key] = normalizeEditorCommandValue(trimmed, key);
        if (trimmed && (fileConfig.CURRENT_EDITOR === undefined || fileConfig.CURRENT_EDITOR === "")) {
            fileConfig.CURRENT_EDITOR = key;
        }
    } else if (key === "CURRENT_EDITOR") {
        if (trimmed !== "SNIPPD_GUI" && trimmed !== "SNIPPD_TUI") {
            throw new Error("CURRENT_EDITOR must be SNIPPD_GUI or SNIPPD_TUI.");
        }
        fileConfig.CURRENT_EDITOR = trimmed;
    } else {
        fileConfig[key] = trimmed;
    }
    
    writeConfigFile(fileConfig);
}

export function getConfigValuesForDisplay(): Partial<Record<ConfigKey, string>> & { EDITORS?: SavedEditors } {
    const fileConfig = readConfigFile();
    const result: Partial<Record<ConfigKey, string>> & { EDITORS?: SavedEditors } = {};

    result.CURRENT_EDITOR = getCurrentEditorKey();

    for (const key of ["SNIPPD_GUI", "SNIPPD_TUI", "OLLAMA_API_URL", "OLLAMA_MODEL"] as ConfigKey[]) {
        const value = fileConfig[key]?.trim();
        if (value) result[key] = value;
    }

    const editors = getSavedEditors();
    if (Object.keys(editors).length > 0) result.EDITORS = editors;

    return result;
}
