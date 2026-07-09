/**
 * Barrel export — import everything from "db/queries" in one line.
*/

export {
    createSnippet,
    getSnippetById,
    getAllSnippets,
    searchSnippets,
    getSnippetsByExtension,
    updateSnippet,
    deleteSnippet,
    countSnippets,
} from "./snippets.ts";

export {
    getOrCreateTag,
    attachTagsToSnippet,
    setTagsForSnippet,
    removeTagFromSnippet,
    getTagsForSnippet,
    getTagById,
    getTagByName,
    getAllTags,
    getSnippetIdsByTag,
    deleteTag,
    countTags,
} from "./tags.ts";
