import { Command } from "commander";
import { addSnippetToContainer, createContainer, deleteContainer, getAllContainers, getContainerByName } from "../../db/queries/containers.ts";
import { getSnippetByIdentifier } from "../../db/queries/snippets.ts";
import chalk from "chalk";
import { renderContainerActions, tabulateContainers } from "../utils/tabulateUtil.ts";

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
        const container = getContainerByName(containerName);
        const snippet = getSnippetByIdentifier(snippetTitle);
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

export default containers;