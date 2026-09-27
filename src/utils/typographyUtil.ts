import chalk from "chalk";
import { SnippetWithTags, Container } from "../types/index.ts";

export const pad = (str: string, width: number) => str.padEnd(width);

export const indent = (str: string, spaces = 4) => `${" ".repeat(spaces)}${str}`;

export const displayName = (e: SnippetWithTags) => {
    const ext = e.extension.replace(/^\./, "");
    return `${e.title}.${ext}`;
};

export const tagsLabel = (tags?: { name: string }[]) =>
    (tags?.map((t) => t.name) ?? []).join(", ");

type SnippetCols = { idW: number; titleW: number; tagsW: number };
type ContainerCols = { idW: number; nameW: number; descW: number };
type ColInput =
    | { type: "snippet"; entries: SnippetWithTags[] }
    | { type: "container"; entries: Container[] };

export function col(input: { type: "snippet"; entries: SnippetWithTags[] }): SnippetCols;
export function col(input: { type: "container"; entries: Container[] }): ContainerCols;

export function col(input: ColInput): SnippetCols | ContainerCols {
    switch (input.type) {
        case "snippet": {
            const idW = Math.max(2, ...input.entries.map((e) => `[${e.id}]`.length)) + 2;
            const titleW = Math.max(5, ...input.entries.map((e) => displayName(e).length)) + 2;
            const tagsW = Math.max(4, ...input.entries.map((e) => tagsLabel(e.tags).length)) + 2;
            return { idW, titleW, tagsW };
        }

        case "container": {
            const idW = Math.max(2, ...input.entries.map((e) => `[${e.id}]`.length)) + 2;
            const nameW = Math.max(5, ...input.entries.map((e) => e.name.length)) + 2;
            const descW = Math.max(11, ...input.entries.map((e) => (e.description ?? "").length)) + 2;
            return { idW, nameW, descW };
        }
    }
}

export const printHeading = (count: number, header: string) => {
    const separator = "─".repeat(header.length);
    console.log(chalk.bold(`Results (${count})`));
    console.log(`${separator}\n${header}\n${separator}`);
};

export const printSubHeading = (
    parentName: string,
    count: number,
    header: string,
    options: { childLabel?: string } = {},
) => {
    const base = options.childLabel ?? "snippet";
    const label = count === 1 ? base : `${base}s`;
    console.log();
    console.log(
        `  ${chalk.cyan("↓")} ${chalk.bold(parentName)} ${chalk.dim(`· ${count} ${label}`)}`,
    );
    const separator = "─".repeat(Math.max(header.length, 28));
    console.log(`${separator}\n${header}\n${separator}`);
};

export const formatSnippetChoices = (
    entries: SnippetWithTags[],
    options: { nested?: boolean } = {},
): { header: string; selections: { name: string; value: SnippetWithTags }[] } => {
    const nested = options.nested ?? false;
    const { idW, titleW, tagsW } = col({ type: "snippet", entries });
    const columns = `${pad("ID", idW)}${pad("Name", titleW)}${pad("Tags", tagsW)}`;
    const header = nested ? indent(columns) : `  ${columns}`;

    const selections = entries.map((entry, index) => {
        const id = pad(`[${entry.id}]`, idW);
        const name = pad(displayName(entry), titleW);
        const tags = pad(tagsLabel(entry.tags) || "—", tagsW);
        const row = `${id}${name}${tags}`;

        if (!nested) {
            return { name: row, value: entry };
        }

        const branch = index === entries.length - 1 ? "└─" : "├─";
        return {
            name: indent(`${chalk.dim(branch)} ${row}`, 2),
            value: entry,
        };
    });

    return { header, selections };
};

export const formatContainerChoices = (
    entries: Container[],
    options: { nested?: boolean } = {},
): { header: string; selections: { name: string; value: Container }[] } => {
    const nested = options.nested ?? false;
    const { idW, nameW, descW } = col({ type: "container", entries });
    const columns = `${pad("ID", idW)}${pad("Name", nameW)}${pad("Description", descW)}`;
    const header = nested ? indent(columns) : `  ${columns}`;

    const selections = entries.map((entry, index) => {
        const id = pad(`[${entry.id}]`, idW);
        const name = pad(entry.name, nameW);
        const desc = pad(entry.description || "—", descW);
        const row = `${id}${name}${desc}`;

        if (!nested) {
            return { name: row, value: entry };
        }

        const branch = index === entries.length - 1 ? "└─" : "├─";
        return {
            name: indent(`${chalk.dim(branch)} ${row}`, 2),
            value: entry,
        };
    });

    return { header, selections };
};
