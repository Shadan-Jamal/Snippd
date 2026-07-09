// ─── Command Types ───────────────────────────────────────
export interface Commands {
    save: string,
    exts: string,
    delete: string,
    list: string,
    search: string,
    recent: string,
}

// ─── Snippet Types ───────────────────────────────────────────

export interface Snippet {
    id: number;
    title: string;
    snippet: string;
    extension: string;
    created_at: string;
    updated_at: string;
}

export interface SnippetWithTags extends Snippet {
    tags: Tag[];
}

export interface CreateSnippetInput {
    title: string;
    snippet: string;
    extension: string;
    tags?: string[];
}
export interface UpdateSnippetInput {
    title?: string;
    snippet?: string;
    extension?: string;
}

// ─── Tag Types ───────────────────────────────────────────────

export interface Tag {
    id: number;
    name: string;
}

export interface ExportData {
    version: number;
    exported_at: string;
    snippets: SnippetWithTags[];
}
