import { Command } from "commander";
import { generateEmbeddings, printOllamaRequired } from "../utils/embeddingUtil.ts";
import chalk from "chalk";

const ai = new Command()

ai
.name("ai")
.description("Enhanced Search.")
.argument("<query>","Describe the content in your snippet.");

const aiAction = async (query: string) => {
    if(!await printOllamaRequired()) return;
    try{
        const embeddings = generateEmbeddings(query);
        
    }
    catch(err){
        console.log(err);
    } 
};

ai.action(aiAction);

export default ai;