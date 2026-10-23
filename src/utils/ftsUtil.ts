/** Split user text into safe FTS5 prefix terms (hyphens/operators are not FTS syntax). */
export function normalizeFtsTerms(query: string): string[] {
    return query
        .trim()
        // FTS5 treats -, :, ", *, ^, (, ) as operators / column syntax
        .replace(/["*^:()]/g, " ")
        .replace(/-/g, " ")
        .split(/\s+/)
        .map((term) => term.replace(/[^a-zA-Z0-9_]/g, ""))
        .filter(Boolean)
        .map((term) => (term.endsWith("*") ? term : `${term}*`));
}

export function buildFTS5Query(query: string, fields: string[]): string {
    const terms = normalizeFtsTerms(query);
    if (terms.length === 0 || fields.length === 0) return "";

    const fieldQueries = fields.map((field) =>
        terms.map((term) => `${field}:${term}`).join(" OR "),
    );

    return fieldQueries.join(" OR ");
}
