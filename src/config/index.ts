import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".snippd");
export const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface EditorConfig {
    name: string;
    command: string;        // the short name, e.g. "code"
    resolvedCommand: string; // full path resolved by which, e.g. C:\...\code.cmd
    args?: string[];
    readOnlyArgs?: string[];
}

export interface SnippdConfig {
    editor: EditorConfig;
}

export function getConfig(): SnippdConfig | null {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return null;
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        return JSON.parse(raw) as SnippdConfig;
    } catch {
        return null;
    }
}

export function setConfig(config: SnippdConfig): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function isConfigured(): boolean {
    return getConfig() !== null;
}

export function getEditorConfig(): EditorConfig {
    const config = getConfig();
    if (!config) {
        throw new Error("Snippd is not configured. Run any command to trigger setup.");
    }
    return config.editor;
}

export function resetConfig(): boolean {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            fs.unlinkSync(CONFIG_FILE);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}
