import { Command } from "commander";
import { getCountPerExtension } from "../../db/queries/snippets.ts";
import { renderSnippetsByExtensions, renderSnippetsByExtension } from "../utils/extensionUtil.ts";
import chalk from "chalk";

const exts = new Command();

exts
.name("exts")
.description("List all snippets by extension extensions.")
.option("-l, --ext <ext...>", "Filter by extension or extensions.");

const extsAction = async (options: { ext?: string[] }) => {
    if (!options.ext) {
        console.log(chalk.greenBright("Listing all extensions."))
        const langsCount = getCountPerExtension();
        renderSnippetsByExtensions(langsCount);
        return;
    }

    await renderSnippetsByExtension(options.ext);
};

exts.action(extsAction);

export default exts;