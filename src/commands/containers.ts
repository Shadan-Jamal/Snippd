import { Command } from "commander";
import { addSnippetToContainer, createContainer, deleteContainer, getAllContainers, getContainerByIdentifier, updateContainerDescription, updateContainerName } from "../../db/queries/containers.ts";
import { getSnippetByIdentifier, removeSnippetFromContainer } from "../../db/queries/snippets.ts";
import chalk from "chalk";
import { renderContainerActions, tabulateContainers } from "../utils/tabulateUtil.ts";
import { extractExtensionFromTitle } from "../utils/extensionUtil.ts";

const containers = new Command();

containers
.name("containers")
.description("Manage containers");

containers
.command("show")
.description("Show all containers")
.action(() => {
    try{
        const containers = getAllContainers();
        if(!containers || containers.length === 0){
            console.log(chalk.red("No containers found."));
            return;
        }
        renderContainerActions(containers);
    } catch (error) {
        console.error(chalk.red("Failed to show containers"));
        console.error(error);
        console.log();
    }
});

containers
.command("create")
.description("Create a new container")
.argument("<name>", "The name of the container")
.option("-d, --description <description>", "(optional) The description of the container")
.action((name: string, options: { description : string }) => {
    try{
        const nameTransformed = name.trim();
        const descTransformed = options?.description?.trim();
        if(nameTransformed.length === 0){
            throw new Error("Name cannot be empty");
        }
        const container = createContainer({
            name: nameTransformed,
            description: descTransformed,
        });
        console.log(chalk.cyan("\n📦 Container created\n"));
        console.log(chalk.dim(`   ${container?.name} (${container?.id})`));
        console.log();
    } catch (error) {
        console.error(chalk.red("Failed to create container:", error));
        console.log();
    }
});

containers
.command("add")
.description("Add a snippet to a container")
.argument("<container-name>", "The name of the container")
.argument("<snippet-title>", "The title of the snippet")
.action((containerName, snippetTitle) => {
    try{
        const container = getContainerByIdentifier(containerName);
        const { cleanTitle } = extractExtensionFromTitle(snippetTitle);
        const snippet = getSnippetByIdentifier(cleanTitle);
        if(!container || !snippet) {
            throw new Error("Container or snippet not found");
        }
        addSnippetToContainer({containerId: container.id, snippetId: snippet.id});
        console.log(chalk.cyan("\n📦 Snippet added to container\n"));
        console.log(chalk.dim(`   ${snippet.title} added to ${container.name}`));
        console.log();
    }
    catch (error) {
        console.error(chalk.red("Failed to add snippet to container:"));
        console.error(error);
        console.log();
    }
});

containers
.command("del")
.description("Delete a container.")
.argument("<container-name>", "The name of the container")
.action((containerName) => {
    const res = deleteContainer(containerName);
    if(!res){
        console.log(chalk.red("Container not found. Try listing all containers using snippd containers show."));
        return;
    }
    console.log(chalk.green("Container deleted."));
});

containers
.command("remove")
.description("Remove a snippet from a container.")
.argument("<container-name>", "The name of the container")
.argument("<snippet-title>", "The title of the snippet")
.action((containerName, snippetTitle) => {
    try{
        const container = getContainerByIdentifier(containerName);
        const { cleanTitle } = extractExtensionFromTitle(snippetTitle);
        const snippet = getSnippetByIdentifier(cleanTitle);
        if(!container || !snippet) {
            throw new Error("Container or snippet not found");
        }
        const removed = removeSnippetFromContainer({containerId: container.id, snippetId: snippet.id});
        if(removed){
            console.log(chalk.cyan("\n📦 Snippet removed from container\n"));
            console.log(chalk.dim(`   ${snippet.title} removed from ${container.name}`));
            console.log();
        } else {
            console.log(chalk.red("Snippet was not in this container."));
        }
    }
    catch (error) {
        console.error(chalk.red("Failed to remove snippet from container:"));
        console.error(error);
        console.log();
    }
});

containers
.command("update")
.description("Update a container's description.")
.argument("<name>", "The name of the container")
.option("-d, --description <description>", "The new description")
.action((name: string, options: { description : string }) => {
    try{
        const container = getContainerByIdentifier(name);
        if(!container){
            console.log(chalk.red("Container not found."));
            return;
        }
        if(!options.description){
            console.log(chalk.yellow("Description is required. Use --description <desc>"));
            return;
        }
        const updated = updateContainerDescription(container.id, options.description);
        if(updated){
            console.log(chalk.cyan("\n📦 Container updated\n"));
            console.log(chalk.dim(`   ${container.name} description updated`));
            console.log();
        } else {
            console.log(chalk.red("Failed to update container."));
        }
    } catch (error) {
        console.error(chalk.red("Failed to update container:"));
        console.error(error);
        console.log();
    }
});

containers
.command("rename")
.description("Rename a container.")
.argument("<old-name>", "The current name of the container")
.argument("<new-name>", "The new name for the container")
.action((oldName: string, newName: string) => {
    try{
        const container = getContainerByIdentifier(oldName);
        if(!container){
            console.log(chalk.red("Container not found."));
            return;
        }
        const existingContainer = getContainerByIdentifier(newName);
        if(existingContainer){
            console.log(chalk.red(`A container named "${newName}" already exists.`));
            return;
        }
        const renamed = updateContainerName(container.id, newName);
        if(renamed){
            console.log(chalk.cyan("\n📦 Container renamed\n"));
            console.log(chalk.dim(`   ${oldName} → ${newName}`));
            console.log();
        } else {
            console.log(chalk.red("Failed to rename container."));
        }
    } catch (error) {
        console.error(chalk.red("Failed to rename container:"));
        console.error(error);
        console.log();
    }
});

export default containers;