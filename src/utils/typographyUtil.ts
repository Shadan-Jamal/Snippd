import chalk from "chalk";
import { SnippetWithTags, SnippetWithDistance, Container } from "../types/index.ts";

export const pad = (str: string, width: number) => str.padEnd(width);

export const indent = (str: string, spaces = 4) => `${" ".repeat(spaces)}${str}`;

export const displayName = (e: SnippetWithTags) => {
    const truncatedTitle = e.title.length > 30 ? `${e.title.slice(0,31)}---` : e.title;
    const ext = e.extension.replace(/^\./, "");
    return `${truncatedTitle}.${ext}`;
};

export const tagsLabel = (tags?: { name: string }[]) =>
    (tags?.map((t) => t.name) ?? []).join(", ");

export const hasDistance = (e: SnippetWithTags): e is SnippetWithDistance =>
    typeof (e as SnippetWithDistance).distance === "number";

/** Match % from vector distance (same formula as the AI UI). */
export const distanceMatchLabel = (distance: number): string => {
    const pct = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
    return `${pct}%`;
};

type SnippetCols = { idW: number; titleW: number; tagsW: number; matchW?: number; updatedW?: number };
type ContainerCols = { idW: number; nameW: number; descW: number };
type ColInput =
    | { type: "snippet"; entries: SnippetWithTags[]; showMatch?: boolean; showUpdatedAt?: boolean }
    | { type: "container"; entries: Container[] };

export function col(input: { type: "snippet"; entries: SnippetWithTags[]; showMatch?: boolean; showUpdatedAt?: boolean }): SnippetCols;
export function col(input: { type: "container"; entries: Container[] }): ContainerCols;

export function col(input: ColInput): SnippetCols | ContainerCols {
    switch (input.type) {
        case "snippet": {
            const idW = Math.max(2, ...input.entries.map((e) => `[${e.id}]`.length)) + 2;
            const titleW = Math.max(5, ...input.entries.map((e) => displayName(e).length)) + 2;
            const tagsW = Math.max(4, ...input.entries.map((e) => tagsLabel(e.tags).length)) + 2;
            const updatedW = input.showUpdatedAt
                ? Math.max("Last edited".length, ...input.entries.map((e) => e.updated_at.length)) + 2
                : undefined;
            if (!input.showMatch) return { idW, titleW, tagsW, updatedW };

            const matchW = Math.max(
                5,
                ...input.entries.map((e) =>
                    hasDistance(e) ? distanceMatchLabel(e.distance).length : 1,
                ),
            ) + 2;
            return { idW, titleW, tagsW, matchW, updatedW };
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
