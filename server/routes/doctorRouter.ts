import { Router, type Request, type Response } from "express";
import {
    CONFIG_FILE,
    checkEditorConfig,
    configFileExists,
    getConfiguredEditorCommand,
} from "../../src/config/snippdConfig.ts";
import { renderDoctorReportHtml } from "../utils/doctorTemplateUtil.ts";
import { doctorCautions, editorRole } from "../utils/misc.ts";

const doctorRouter = Router();

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
