import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import ollama from "ollama";
import { getOllamaClient } from "@/src/config/ollamaConfig.ts";

export const configInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack: () => Promise<void>,
): Promise<void> => {
    const configAction = await select({
        message: chalk.bold("Config options:"),
        choices: [
            { name: "Show current config", value: "show" },
            { name: "Manage saved editors", value: "editor" },
            { name: "Set a config value", value: "set" },
            { name: "Reset config to defaults", value: "reset" },
            { name: "Init config file", value: "init" },
            { name: "Editor setup instructions", value: "setup" },
            { name: chalk.dim("  Back"), value: "back" },
        ],
    });

    if (configAction === "back") { await onBack(); return; }

    if (configAction === "set") {
        const key = await input({ message: "Config key (e.g. OLLAMA_MODEL):" });
        const value = await input({ message: `Value for ${key}:` });
        await program.parseAsync([...parseAsyncArgs, "config", "set", key.trim(), value.trim()]);
        return;
    }

    await program.parseAsync([...parseAsyncArgs, "config", configAction]);
};

export const checkModelConfigured = async (model: string): Promise<boolean> => {
    try{
        const ollama = getOllamaClient();
        const models = await ollama.list();
        return models.models.some(m => m.name === model || m.name.includes(model));
    } catch {
        return false;
    }
}