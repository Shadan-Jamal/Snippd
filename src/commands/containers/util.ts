import { program } from "commander";
import chalk from "chalk";
import { input, select, confirm } from "@inquirer/prompts";
import { ContainerAction } from "@/src/types/index.ts";

export const containersInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack: () => Promise<void>,
): Promise<void> => {
    console.log(chalk.cyan("\nContainers\n"));

    const action = await select<ContainerAction>({
        message: "What would you like to do?",
        choices: [
            { name: "Browse / show containers", value: "show" },
            { name: "Create a container", value: "create" },
            { name: "Add snippet to container", value: "add" },
            { name: "Remove snippet from container", value: "remove" },
            { name: "Delete a container", value: "del" },
            { name: "Rename a container", value: "rename" },
            { name: "Update container description", value: "update" },
            { name: chalk.dim("  Back to menu"), value: "back" },
        ],
    });

    if (action === "back") {
        await onBack();
        return;
    }

    if (action === "show") {
        const searchQ = await input({
            message: "Filter by name/description (optional):",
            default: "",
        });
        const args = [...parseAsyncArgs, "containers", "show"];
        if (searchQ.trim()) args.push("--search", searchQ.trim());
        await program.parseAsync(args);
        return;
    }

    if (action === "create") {
        const name = await input({
            message: "Container name:",
            validate: (v) => v.trim().length > 0 || "Name cannot be empty.",
        });
        const desc = await input({
            message: "Description (optional):",
            default: "",
        });
        const args = [...parseAsyncArgs, "containers", "create", name.trim()];
        if (desc.trim()) args.push("--description", desc.trim());
        await program.parseAsync(args);
        return;
    }

    if (action === "add") {
        const containerName = await input({
            message: "Container name:",
            validate: (v) => v.trim().length > 0 || "Container name cannot be empty.",
        });
        const snippetTitle = await input({
            message: "Snippet title to add:",
            validate: (v) => v.trim().length > 0 || "Snippet title cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "containers", "add", containerName.trim(), snippetTitle.trim()]);
        return;
    }

    if (action === "remove") {
        const containerName = await input({
            message: "Container name:",
            validate: (v) => v.trim().length > 0 || "Container name cannot be empty.",
        });
        const snippetTitle = await input({
            message: "Snippet title to remove:",
            validate: (v) => v.trim().length > 0 || "Snippet title cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "containers", "remove", containerName.trim(), snippetTitle.trim()]);
        return;
    }

    if (action === "del") {
        const containerName = await input({
            message: "Container name to delete:",
            validate: (v) => v.trim().length > 0 || "Container name cannot be empty.",
        });
        const confirmed = await confirm({
            message: `Are you sure you want to delete container "${containerName.trim()}"?`,
            default: false,
        });
        if (!confirmed) { console.log(chalk.dim("Cancelled.\n")); return; }
        await program.parseAsync([...parseAsyncArgs, "containers", "del", containerName.trim()]);
        return;
    }

    if (action === "rename") {
        const oldName = await input({
            message: "Current container name:",
            validate: (v) => v.trim().length > 0 || "Name cannot be empty.",
        });
        const newName = await input({
            message: "New container name:",
            validate: (v) => v.trim().length > 0 || "Name cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "containers", "rename", oldName.trim(), newName.trim()]);
        return;
    }

    if (action === "update") {
        const name = await input({
            message: "Container name:",
            validate: (v) => v.trim().length > 0 || "Name cannot be empty.",
        });
        const desc = await input({
            message: "New description:",
            validate: (v) => v.trim().length > 0 || "Description cannot be empty.",
        });
        await program.parseAsync([...parseAsyncArgs, "containers", "update", name.trim(), "--description", desc.trim()]);
    }
};
