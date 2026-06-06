import { Command } from "commander";
import { deleteSnippet } from "../db/queries/snippets.ts";
import chalk from "chalk";

const deleteCmd = new Command();

deleteCmd
    .name("delete")
    .description("Delete a snippet by title.")
    .argument("<title>", "Title of the snippet to delete.");

const deleteCmdAction = (identifier: any) => {
    const result = deleteSnippet(identifier);
    if (!result) {
        console.log(chalk.red(`Could not find and delete snippet: ${identifier}`));
        return;
    }
    console.log(chalk.green(`Successfully deleted snippet: ${identifier}`));
}

deleteCmd.action(deleteCmdAction);

export default deleteCmd;