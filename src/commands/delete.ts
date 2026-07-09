import { Command } from "commander";
import { deleteSnippet } from "../../db/queries/snippets.ts";
import { getAllSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets } from "../utils/tabulateSnippets.ts";
import chalk from "chalk";
import { searchSnippets } from "../../db/queries/snippets.ts";

const deleteCmd = new Command();

deleteCmd
    .name("delete")
    .description("Delete a snippet by title.")
    .argument("[title]", "Title of the snippet to delete.");

const deleteCmdAction = (identifier: any) => {
    if(!identifier){
        console.log(chalk.yellow("Title not provided. Showing all the snippets."));
        const snippets = getAllSnippets();
        tabulateSnippets(snippets, false);
        return;
    }
    const result = deleteSnippet(identifier);
    if (!result) {
        console.log(chalk.red(`Could not delete snippet.`));
        console.log(chalk.bgYellowBright(`Showing all the snippets for "${identifier}"`))
        const results = searchSnippets(identifier);
        tabulateSnippets(results, false);
        return;
    }
    console.log(chalk.green(`Successfully deleted snippet: ${identifier}`));
}

deleteCmd.action(deleteCmdAction);

export default deleteCmd;