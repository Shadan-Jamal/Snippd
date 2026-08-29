import fs from "node:fs";
import path from "node:path";
import { config as paths } from "../utils/config.ts";

export const CONFIG_FILE = path.join(paths.dataDir, "config.json");

export type ConfigEnvKey = "SNIPPD_EDITOR" | "VISUAL" | "EDITOR";

export type ConfigField = "visual" | "editor" | "snippdEditor";

export interface SnippdConfig {
    visual?: string;
    editor?: string;
    snippdEditor?: string;
}

/** Keys applied from ~/.snippd/config.json (shell env overrides these). */
export const configAppliedKeys = new Set<ConfigEnvKey>();

const FIELD_TO_ENV: Record<ConfigField, ConfigEnvKey> = {
    visual: "VISUAL",
    editor: "EDITOR",
    snippdEditor: "SNIPPD_EDITOR",
};

const ENV_TO_FIELD: Record<ConfigEnvKey, ConfigField> = {
    VISUAL: "visual",
    EDITOR: "editor",
    SNIPPD_EDITOR: "snippdEditor",
};

const FIELD_ALIASES: Record<string, ConfigField> = {
    visual: "visual",
    editor: "editor",
    snippd: "snippdEditor",
    snippd_editor: "snippdEditor",
    snippdeditor: "snippdEditor",
};

export function normalizeConfigField(key: string): ConfigField | null {
    const normalized = key.trim().toLowerCase().replace(/-/g, "_");
    return FIELD_ALIASES[normalized] ?? null;
}

export function configFileExists(): boolean {
    return fs.existsSync(CONFIG_FILE);
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
        visual: "",
        editor: "",
    });
    return true;
}

/**
 * Load ~/.snippd/config.json into process.env.
 * Shell variables already set take precedence over the file.
 */
export function loadSnippdConfig(): void {
    configAppliedKeys.clear();

    const fileConfig = readConfigFile();

    for (const [field, envKey] of Object.entries(FIELD_TO_ENV) as [ConfigField, ConfigEnvKey][]) {
        const value = fileConfig[field]?.trim();
        if (!value) continue;

        if (!process.env[envKey]?.trim()) {
            process.env[envKey] = value;
            configAppliedKeys.add(envKey);
        }
    }
}

export function setConfigField(field: ConfigField, value: string): void {
    const fileConfig = readConfigFile();
    fileConfig[field] = value.trim();
    writeConfigFile(fileConfig);

    const envKey = FIELD_TO_ENV[field];
    process.env[envKey] = value.trim();
    configAppliedKeys.add(envKey);
}

export function getConfigFieldsForDisplay(): Partial<Record<ConfigField, string>> {
    const fileConfig = readConfigFile();
    const result: Partial<Record<ConfigField, string>> = {};

    for (const field of ["visual", "editor", "snippdEditor"] as ConfigField[]) {
        const value = fileConfig[field]?.trim();
        if (value) result[field] = value;
    }

    return result;
}

export function getEnvKeyForField(field: ConfigField): ConfigEnvKey {
    return FIELD_TO_ENV[field];
}

export function getFieldForEnvKey(envKey: ConfigEnvKey): ConfigField {
    return ENV_TO_FIELD[envKey];
}
