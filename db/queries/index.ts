/**
 * Barrel export — import everything from "db/queries" in one line.
*/

export {
    createSnippet,
    getSnippetByIdentifier,
    getAllSnippets,
    getRecentSnippets,
    searchSnippets,
    getSnippetsByExtension,
    getCountPerExtension,
    updateSnippet,
    deleteSnippet,
    deleteSnippetById,
    deleteSnippetsByIds,
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
