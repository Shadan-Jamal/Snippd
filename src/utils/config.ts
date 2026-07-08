import path from "path";
import os from "os";

/**
 * Snippd stores its database in a dedicated directory under the user's
 * home folder so the CLI works the same regardless of the current
 * working directory.
 *
 * Default location:  ~/.snippd/snippd.db
 */

const SNIPPD_DIR = path.join(os.homedir(), ".snippd");
const DB_FILE = "snippd.db";

export const config = {
    dataDir: SNIPPD_DIR,
    dbPath: path.join(SNIPPD_DIR, DB_FILE),
};
