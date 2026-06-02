import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { createSnippet } from "../db/queries/snippets.ts";

const save = new Command();

// Define the command
save
    .name("save")
    .description("Save a new snippet.")
    .argument("<title>", "Title of the Snippet")
    .option("-t, --tags [tags...]", "Tags to associate with the snippet.", [])
    .option("-l, --lang [lang]", "Language of the snippet.", "");

// Define the action
const saveAction = async (title: string, options: { tags: string[], lang: string }) => {
    console.log(`Saving snippet to ${title} with options ${options.tags} and ${options.lang}`);
    const answers = {
        snippet: await input({ message: "Enter the snippet \n", required: true })
    };
    console.log("Answers:", answers);
    const snippet = createSnippet({
        title: title,
        language: options.lang,
        snippet: answers.snippet,
        tags: options?.tags
    })
    console.log("Snippet:", snippet);
};

save.action(saveAction);

export default save;