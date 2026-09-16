import { Router, type Request, type Response } from "express";
import {
    CONFIG_FILE,
    checkEditorConfig,
    configFileExists,
    getConfiguredEditorCommand,
    readConfigFile,
} from "../../src/config/snippdConfig.ts";
import { renderDoctorReportHtml } from "../utils/templates.ts";

const doctorRouter = Router();

function editorRole(key: string | null): string {
    if (key === "SNIPPD_VISUAL") return "GUI";
    if (key === "SNIPPD_EDITOR") return "TUI";
    return "fallback";
}

function doctorCautions(): string[] {
    const cautions: string[] = [];
    const { SNIPPD_VISUAL, SNIPPD_EDITOR } = readConfigFile();
    const visual = SNIPPD_VISUAL?.trim() ?? "";
    const editor = SNIPPD_EDITOR?.trim() ?? "";

    if (visual && !editor) {
        cautions.push("SNIPPD_EDITOR is empty — only SNIPPD_VISUAL is used.");
    } else if (editor && !visual) {
        cautions.push("SNIPPD_VISUAL is empty — only SNIPPD_EDITOR is used.");
    }

    return cautions;
}

doctorRouter.get("/", (_req: Request, res: Response) => {
    try {
        const { command, key } = getConfiguredEditorCommand();
        const { errors, warnings } = checkEditorConfig();

        res.type("html").send(renderDoctorReportHtml({
            configFile: CONFIG_FILE,
            command,
            key,
            role: editorRole(key),
            exists: configFileExists(),
            errors,
            warnings,
            cautions: doctorCautions(),
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
