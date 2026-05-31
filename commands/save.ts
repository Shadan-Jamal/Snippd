import { Command } from "commander";
import { input } from "@inquirer/prompts";
const save = new Command();

// Define the command
save
.name("save")
.arguments("<fileName> [tagNames...]")
.description("Save a new snippet.");

// Define the action
const saveAction = async (fileName: string, tagNames: string[]) => {
    console.log(`Saving snippet to ${fileName} with tags ${tagNames.join(", ")}`);
    const answers = {
        codeSnippet: await input({message: "Enter the code snippet \n", required: true})
    };
    console.log("Answers:", answers);
};

save.action(saveAction).parse();


export default save;