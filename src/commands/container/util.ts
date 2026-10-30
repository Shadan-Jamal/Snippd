import { program } from "commander";
import chalk from "chalk";
import { input, select, confirm } from "@inquirer/prompts";
import { ContainerAction } from "@/src/types/index.ts";

export const containerInteractiveFlow = async (
    parseAsyncArgs: string[],
    onBack?: () => Promise<void>,
): Promise<void> => {
    console.log(chalk.cyan("\nContainers\n"));

    const choices: { name: string; value: ContainerAction }[] = [
        { name: "Browse / show containers", value: "show" },
        { name: "Create a container", value: "create" },
        { name: "Add snippet to container", value: "add" },
        { name: "Remove snippet from container", value: "remove" },
        { name: "Delete a container", value: "del" },
        { name: "Rename a container", value: "rename" },
        { name: "Update container description", value: "update" },
    ];
    if (onBack) {
        choices.push({ name: chalk.yellow("  Back to menu"), value: "back" });
    }

    const action = await select<ContainerAction>({
        message: "What would you like to do?",
        choices,
    });

    if (action === "back") {
        if (onBack) await onBack();
        return;
    }

    if (action === "show") {
        const searchQ = await input({
            message: "Filter by name/description (optional):",
            default: "",
        });
        const { getAllContainers, searchContainers } = await import("@/db/queries/containers.ts");
        const { renderContainerActions } = await import("@/src/utils/tabulateUtil.ts");
        const list = searchQ.trim()
            ? searchContainers(searchQ.trim())
            : getAllContainers();
        if (!list?.length) {
            console.log(chalk.red(
                searchQ.trim()
                    ? `No containers found for "${searchQ.trim()}".`
                    : "No containers found.",
            ));
            return;
        }
        await renderContainerActions(list, async () => {
            await containerInteractiveFlow(parseAsyncArgs, onBack);
        });
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
        const args = [...parseAsyncArgs, "container", "create", name.trim()];
        if (desc.trim()) args.push("--description", desc.trim());
        await program.parseAsync(args);
        return;
    }

    if (action === "add") {
        const { getAllContainers, getContainerSnippets } = await import("@/db/queries/containers.ts");
        const { getAllSnippets } = await import("@/db/queries/snippets.ts");
        const { pickContainer, tabulateSnippets } = await import("@/src/utils/tabulateUtil.ts");

        const containers = getAllContainers();
        if (!containers.length) {
            console.log(chalk.red("No containers found.\n"));
            return;
        }

        const container = await pickContainer(containers);
        if (!container) return;

        const alreadyIn = new Set(getContainerSnippets(container.id).map((s) => s.id));
        const available = getAllSnippets().filter((s) => !alreadyIn.has(s.id));
        if (!available.length) {
            console.log(chalk.yellow(`No snippets left to add to ${chalk.bold(container.name)}.\n`));
            return;
        }

        const snippet = await select({
            message: `Add to ${chalk.bold(container.name)}:`,
            choices: tabulateSnippets(available),
            pageSize: 10,
            theme: { prefix: "" },
        });

        await program.parseAsync([
            ...parseAsyncArgs,
            "container",
            "add",
            container.name,
            snippet.title,
        ]);
        return;
    }

    if (action === "remove") {
        const { getAllContainers, getContainerSnippets } = await import("@/db/queries/containers.ts");
        const { pickContainer, tabulateSnippets } = await import("@/src/utils/tabulateUtil.ts");

        const containers = getAllContainers();
        if (!containers.length) {
            console.log(chalk.red("No containers found.\n"));
            return;
        }

        const container = await pickContainer(containers);
        if (!container) return;

        const inContainer = getContainerSnippets(container.id);
        if (!inContainer.length) {
            console.log(chalk.yellow(`No snippets in ${chalk.bold(container.name)}.\n`));
            return;
        }

        const snippet = await select({
            message: `Remove from ${chalk.bold(container.name)}:`,
            choices: tabulateSnippets(inContainer),
            pageSize: 10,
            theme: { prefix: "" },
        });

        await program.parseAsync([
            ...parseAsyncArgs,
            "container",
            "remove",
            container.name,
            snippet.title,
        ]);
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
        await program.parseAsync([...parseAsyncArgs, "container", "del", containerName.trim()]);
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
        await program.parseAsync([...parseAsyncArgs, "container", "rename", oldName.trim(), newName.trim()]);
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
        await program.parseAsync([...parseAsyncArgs, "container", "update", name.trim(), "--description", desc.trim()]);
    }
};
