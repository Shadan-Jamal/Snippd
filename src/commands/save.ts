import { Command } from "commander";
import { editor } from "@inquirer/prompts";
import { createSnippet } from "../../db/queries/snippets.ts";
import chalk from "chalk";

const save = new Command();

// Define the command
save
    .name("save")
    .description(chalk.greenBright("Save a new snippet."))
    .argument("<title>", "Title of the Snippet")
    .option("-e, --ext <ext>", "Language Extension of the snippet.")
    .option("-t, --tags <tags...>", "Tags to associate with the snippet.")
    // .error(chalk.red("Title is missing, please enter a snippet title."));

// Define the action
const saveAction = async (title: string, options: { tags: string[], ext: string }) => {
    console.log(`Saving snippet to ${chalk.blueBright(title)}`);
    if(options.tags && options.ext){
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))} and extension ${chalk.blueBright(options.ext)}`);
    }
    else if(options.tags){
        console.log(`With tags ${chalk.blueBright(options.tags.join(","))}`);
    }
    else if(options.ext){
        console.log(`With extension ${chalk.blueBright(options.ext)}`);
    }

    const snippetContent = await editor({ message: "Enter the snippet \n", waitForUserInput: true })
    console.log("Answers:", snippetContent);
    const snippet = createSnippet({
        title: title,
        extension: options.ext,
        snippet: snippetContent,
        tags: options?.tags
    })

    if (!snippet.snippet) {
        console.log(chalk.red("Snippet cannot be empty"));
        saveAction(title, options);
        return;
    }

    console.log(chalk.green("Snippet saved successfully"));

    console.log("Snippet:", snippet);
};

save.action(saveAction);

export default save;