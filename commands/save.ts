import { Command } from "commander";
import { editor } from "@inquirer/prompts";
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
    const snippetContent = await editor({ message: "Enter the snippet \n", waitForUserInput: true })
    console.log("Answers:", snippetContent);
    const snippet = createSnippet({
        title: title,
        language: options.lang,
        snippet: snippetContent,
        tags: options?.tags
    })
    console.log("Snippet:", snippet);
};

save.action(saveAction);

export default save;