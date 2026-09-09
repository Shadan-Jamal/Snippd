import { checkConfig } from "./config/snippdConfig.ts";
import { program } from "commander";
import save from "./commands/save.ts"
import search from "./commands/search.ts";
import deleteCmd from "./commands/delete.ts";
import list from "./commands/list.ts";
import recent from "./commands/recent.ts";
import exts from "./commands/exts.ts";
import config from "./commands/config.ts";
import doctor from "./commands/doctor.ts";
import { showEditorSetupTip, showWindowsPathTip } from "./utils/editor.ts";

if(!checkConfig()) {
    showEditorSetupTip();
    showWindowsPathTip();
}

program.addCommand(save);
program.addCommand(search);
program.addCommand(deleteCmd);
program.addCommand(list);
program.addCommand(recent);
program.addCommand(exts);
program.addCommand(config);
program.addCommand(doctor);

program.parseAsync();
