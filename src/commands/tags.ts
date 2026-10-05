import { Command } from "commander";
import chalk from "chalk";
import { select, confirm } from "@inquirer/prompts";
import {
    getTagsWithCounts,
    getTagByName,
    getTagByNameWithCount,
    renameTag,
    deleteTag,
    getSnippetIdsByTag,
} from "../../db/queries/tags.ts";
import { getAllSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets, renderSnippetActions } from "../utils/tabulateUtil.ts";

const tags = new Command();

tags
    .name("tags")
    .description("Manage tags.")
    .action(async () => {
        await showTagsList();
    });

tags
    .command("show")
    .description("List all tags with snippet counts.")
    .action(async () => {
        await showTagsList();
    });

tags
    .command("view")
    .description("Show snippets with a specific tag.")
    .argument("<tag>", "Tag name")
    .action(async (tagName: string) => {
        await showSnippetsByTag(tagName);
    });

tags
    .command("delete")
    .description("Delete a tag.")
    .argument("<tag>", "Tag name")
    .action(async (tagName: string) => {
        const tag = getTagByName(tagName);
        if (!tag) {
            console.log(chalk.red(`Tag "${tagName}" not found.`));
            return;
        }

        const tagWithCount = getTagByNameWithCount(tagName);
        const snippetCount = tagWithCount?.snippet_count || 0;

        if (snippetCount > 0) {
            console.log(chalk.yellow(`Tag "${tagName}" is used by ${snippetCount} snippet(s).`));
        }

        const confirmed = await confirm({
            message: `Are you sure you want to delete tag "${tagName}"?`,
            default: false,
        });

        if (!confirmed) {
            console.log(chalk.yellow("Deletion cancelled."));
            return;
        }

        const deleted = deleteTag(tag.id);
        if (deleted) {
            console.log(chalk.green(`Tag "${tagName}" deleted successfully.`));
        } else {
            console.log(chalk.red("Failed to delete tag."));
        }
    });

tags
    .command("rename")
    .description("Rename a tag.")
    .argument("<old-name>", "Current tag name")
    .argument("<new-name>", "New tag name")
    .action(async (oldName: string, newName: string) => {
        const oldTag = getTagByName(oldName);
        if (!oldTag) {
            console.log(chalk.red(`Tag "${oldName}" not found.`));
            return;
        }

        const existingTag = getTagByName(newName);
        if (existingTag) {
            console.log(chalk.red(`Tag "${newName}" already exists.`));
            return;
        }

        const renamed = renameTag(oldTag.id, newName);
        if (renamed) {
            console.log(chalk.green(`Tag renamed from "${oldName}" to "${newName}".`));
        } else {
            console.log(chalk.red("Failed to rename tag."));
        }
    });

async function showTagsList(): Promise<void> {
    const tagsWithCounts = getTagsWithCounts();

    if (tagsWithCounts.length === 0) {
        console.log(chalk.yellow("No tags found."));
        return;
    }

    console.log(chalk.cyan("\n📋 Tags\n"));

    const maxNameLength = Math.max(4, ...tagsWithCounts.map((t) => t.name.length));
    const maxCountLength = Math.max(5, ...tagsWithCounts.map((t) => t.snippet_count.toString().length));

    const header = `${"Name".padEnd(maxNameLength)}  ${"Snippets".padEnd(maxCountLength)}`;
    const separator = "─".repeat(header.length);

    console.log(`  ${header}`);
    console.log(`  ${separator}`);

    for (const tag of tagsWithCounts) {
        const name = tag.name.padEnd(maxNameLength);
        const count = tag.snippet_count.toString().padEnd(maxCountLength);
        console.log(`  ${name}  ${count}`);
    }

    console.log();

    const choices = tagsWithCounts.map((tag) => ({
        name: `${tag.name} (${tag.snippet_count})`,
        value: tag.name,
    }));

    choices.push({ name: chalk.red("Cancel"), value: "__cancel__" });

    const selected = await select({
        message: "Select a tag to view snippets:",
        choices,
        pageSize: 10,
        theme: { prefix: "" },
    });

    if (selected === "__cancel__") return;

    await showSnippetsByTag(selected);
}

async function showSnippetsByTag(tagName: string): Promise<void> {
    const tag = getTagByName(tagName);
    if (!tag) {
        console.log(chalk.red(`Tag "${tagName}" not found.`));
        return;
    }

    const snippetIds = getSnippetIdsByTag(tagName);
    if (snippetIds.length === 0) {
        console.log(chalk.yellow(`No snippets found with tag "${tagName}".`));
        return;
    }

    const allSnippets = getAllSnippets();
    const taggedSnippets = allSnippets.filter((s) => snippetIds.includes(s.id));

    const selections = tabulateSnippets(taggedSnippets);
    if (!selections) return;

    await renderSnippetActions(selections, taggedSnippets);
}

export default tags;
