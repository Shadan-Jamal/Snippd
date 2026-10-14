// ─── Command Types ───────────────────────────────────────
export interface Commands {
    save: string,
    exts: string,
    delete: string,
    list: string,
    search: string,
    recent: string,
    tags: string,
    edit: string,
    copy: string,
    view: string,
}

// ─── Snippet Types ───────────────────────────────────────────

export interface Snippet {
    id: number;
    title: string;
    code: string;
    extension: string;
    created_at: string;
    updated_at: string;
}

export interface SnippetWithTags extends Snippet {
    tags: Tag[];
}

export interface CreateSnippetInput {
    title: string;
    code: string;
    extension: string;
    tags?: string[];
}

export interface UpdateSnippetInput {
    title?: string;
    code?: string;
    extension?: string;
}

// ─── Tag Types ───────────────────────────────────────────────

export interface Tag {
    id: number;
    name: string;
}

export interface TagWithCount extends Tag {
    snippet_count: number;
}

export interface ExportData {
    version: number;
    exported_at: string;
    snippets: SnippetWithTags[];
}


// ─── Container Types ───────────────────────────────────────────────

export interface Container {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface CreateContainerInput {
    name: string;
    description: string;
}


// ─── Config Types ───────────────────────────────────────────────


export type ConfigKey = "SNIPPD_VISUAL" | "SNIPPD_EDITOR" | "OLLAMA_API_URL" | "OLLAMA_MODEL";

export interface SnippdConfig {
    SNIPPD_VISUAL?: string;
    SNIPPD_EDITOR?: string;
    OLLAMA_API_URL?: string;
    OLLAMA_MODEL?: string;
}

export interface ConfigCheckResult {
    errors: string[];
    warnings: string[];
}

export interface EmbeddingMeta {
    model: string;
    dim: number;
    updated_at: string;
}

export interface SnippetWithDistance extends SnippetWithTags {
    distance: number;
}