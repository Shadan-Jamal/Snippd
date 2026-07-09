import { getSnippetsByExtension, getFilteredSnippets } from "../../db/queries/snippets.ts";
import { tabulateSnippets, renderActions } from "./tabulateSnippets.ts";
import { select } from "@inquirer/prompts";
import chalk from "chalk";

export const renderSnippetsByExtensions = async (
    langsCount: { extension: string; count: number }[] | undefined,
): Promise<void> => {
    if (!langsCount) return;

    const langChoices = [
        ...langsCount.map((ext) => ({
            name: `${ext.extension} (${ext.count})`,
            value: ext.extension,
        })),
        { name: chalk.red("Cancel"), value: "__cancel__" },
    ];

    const selectedLang = await select({
        message: "",
        choices: langChoices,
        pageSize: 10,
        theme: { prefix: "",  },
    });

    if (selectedLang === "__cancel__") return;

    const snippets = getSnippetsByExtension(selectedLang);
    const selections = tabulateSnippets(snippets);

    if (!selections) return;

    // Pass onBack so "Go Back" in the action menu returns to the extension picker
    await renderActions(selections, snippets, () => renderSnippetsByExtensions(langsCount));
};

export const renderSnippetsByExtension = async (
    exts: string[],
): Promise<void> => {
    const snippets = getFilteredSnippets({ ext: exts });

    if (snippets.length === 0) {
        console.log(chalk.yellow(`No snippets found for extension(s): ${exts.join(", ")}.`));
        return;
    }

    const selections = tabulateSnippets(snippets);
    if (!selections) return;

    await renderActions(selections, snippets, () => renderSnippetsByExtension(exts));
};