import { Router, type Request, type Response } from "express";
import {
    CONFIG_FILE,
    checkEditorConfig,
    configFileExists,
    getConfiguredEditorCommand,
} from "../../src/config/snippdConfig.ts";
import { readOllamaConfig } from "@/src/config/ollamaConfig.ts";
import { checkOllamaAvailable, ensureConfiguredModelAvailable } from "../../src/commands/ai/util.ts";
import { countIndexed, getEmbeddingMeta } from "@/db/queries/embeddings.ts";
import { countSnippets } from "@/db/queries/snippets.ts";
import { renderDoctorReportHtml } from "../utils/doctorTemplateUtil.ts";
import { doctorCautions, editorRole } from "../utils/misc.ts";

const doctorRouter = Router();

doctorRouter.get("/", async (_req: Request, res: Response) => {
    try {
        const { command, key } = getConfiguredEditorCommand();
        const { errors, warnings } = checkEditorConfig();

        // Ollama checks
        const ollamaConfig = readOllamaConfig();
        const ollamaUp = await checkOllamaAvailable();
        let modelOk = false;
        if (ollamaUp && ollamaConfig?.model?.trim()) {
            modelOk = await ensureConfiguredModelAvailable();
        }

        const meta = getEmbeddingMeta();
        const snippets = countSnippets();
        const indexed = countIndexed();

        res.type("html").send(renderDoctorReportHtml({
            configFile: CONFIG_FILE,
            command,
            key,
            role: editorRole(key),
            exists: configFileExists(),
            errors,
            warnings,
            cautions: doctorCautions(),
            ollama: {
                api: ollamaConfig?.api || "http://localhost:11434",
                model: ollamaConfig?.model || null,
                reachable: ollamaUp,
                modelAvailable: modelOk,
                indexModel: meta?.model || null,
                indexDim: meta?.dim || null,
                indexed,
                total: snippets,
            },
        }));
    } catch (error) {
        console.error(error);
        res.type("html").send(`
          <section class="rounded-lg border border-danger/20 bg-danger-soft/40 p-5">
            <h2 class="text-sm font-semibold text-danger">Errors</h2>
            <p class="mt-3 text-sm">Could not run doctor: ${String(error)}</p>
          </section>
        `);
    }
});

export default doctorRouter;
