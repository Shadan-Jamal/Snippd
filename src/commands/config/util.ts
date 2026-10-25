import { program } from "commander";
import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import { getOllamaClient } from "@/src/config/ollamaConfig.ts";

export const configInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack?: () => Promise<void>,
): Promise<void> => {
    const choices: { name: string; value: string }[] = [
        { name: "Show current config", value: "show" },
        { name: "Manage saved editors", value: "editor" },
        { name: "Set a config value", value: "set" },
        { name: "Reset config to defaults", value: "reset" },
        { name: "Init config file", value: "init" },
        { name: "Editor setup instructions", value: "setup" },
    ];
    if (onBack) {
        choices.push({ name: chalk.yellow("  Back"), value: "back" });
        console.clear();
    }

    const configAction = await select({
        message: chalk.bold("Config options:"),
        choices,
    });

    if (configAction === "back") {
        if (onBack) await onBack();
        return;
    }

    if (configAction === "set") {
        const key = await select({
            message: "Select a configuration setting:",
            choices: [
                { name: "Current editor mode (GUI or TUI)", value: "CURRENT_EDITOR" },
                { name: "GUI editor command", value: "SNIPPD_GUI" },
                { name: "TUI editor command", value: "SNIPPD_TUI" },
                { name: "Ollama API URL", value: "OLLAMA_API_URL" },
                { name: "Ollama embedding model", value: "OLLAMA_MODEL" },
            ],
        });
        const value = key === "CURRENT_EDITOR"
            ? await select({
                message: "Choose the current editor:",
                choices: [
                    { name: "GUI editor (SNIPPD_GUI)", value: "SNIPPD_GUI" },
                    { name: "TUI editor (SNIPPD_TUI)", value: "SNIPPD_TUI" },
                ],
            })
            : (key === "OLLAMA_MODEL") ? await select({
                message: "Choose an Ollama embedding model:",
                choices: [
                    { name: "Default model", value: "default" },
                    { name: "Custom model", value: "custom" },
                ],
            }) : await input({ message: `Value for ${key}:` });
        await program.parseAsync([...parseAsyncArgs, "config", "set", key, value.trim()]);
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