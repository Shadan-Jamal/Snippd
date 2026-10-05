import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import { defaultExport, exportDatabase, importDatabase } from "../../db/backup.ts";
import { renderBackupMessageHtml, renderImportResultHtml } from "../utils/backupTemplateUtil.ts";

const backupRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

backupRouter.post("/import", upload.single("backup"), (req: Request, res: Response) => {
    let tmpPath: string | undefined;
    try {
        if (!req.file?.buffer?.length) {
            return res
                .type("html")
                .send(renderBackupMessageHtml("No backup file uploaded. Choose a .db file first.", "error"));
        }

        tmpPath = path.join(os.tmpdir(), `snippd-import-${Date.now()}-${process.pid}.db`);
        fs.writeFileSync(tmpPath, req.file.buffer);

        const result = importDatabase(tmpPath);
        return res.type("html").send(renderImportResultHtml(result));
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        return res.type("html").send(renderBackupMessageHtml(`Import failed: ${message}`, "error"));
    } finally {
        if (tmpPath) {
            try {
                fs.unlinkSync(tmpPath);
            } catch {
                /* ignore cleanup errors */
            }
        }
    }
});

backupRouter.post("/export", async (req: Request, res: Response) => {
    try {
        const exportPath = typeof req.body?.path === "string" ? req.body.path.trim() : "";
        const finalDest = exportPath
            ? await exportDatabase(exportPath)
            : await exportDatabase();

        if (!finalDest || finalDest === "Failed") {
            return res
                .type("html")
                .send(renderBackupMessageHtml("Could not export database.", "error"));
        }

        return res
            .type("html")
            .send(renderBackupMessageHtml(`Saved at ${finalDest}`, "ok"));
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        return res.type("html").send(renderBackupMessageHtml(`Could not export: ${message}`, "error"));
    }
});

backupRouter.get("/export/download", async (_req: Request, res: Response) => {
    let tmpPath: string | undefined;

    try {
        const { finalName } = defaultExport();
        tmpPath = path.join(os.tmpdir(), finalName);
        const dest = await exportDatabase(tmpPath);

        if (!dest || dest === "Failed" || !fs.existsSync(dest)) {
            return res
                .status(500)
                .type("html")
                .send(renderBackupMessageHtml("Could not prepare download.", "error"));
        }

        res.download(dest, finalName, (err) => {
            fs.unlink(dest, () => {});
            if (err) console.error(err);
        });
    } catch (err) {
        console.error(err);
        if (tmpPath) fs.unlink(tmpPath, () => {});
        const message = err instanceof Error ? err.message : String(err);
        return res
            .status(500)
            .type("html")
            .send(renderBackupMessageHtml(`Download failed: ${message}`, "error"));
    }
});

export default backupRouter;
