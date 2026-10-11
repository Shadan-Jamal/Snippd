import { checkConfig } from "./config/snippdConfig.ts";
import { program } from "commander";
import save from "./commands/save/index.ts"
import search from "./commands/search/index.ts";
import deleteCmd from "./commands/delete/index.ts";
import list from "./commands/list/index.ts";
import recent from "./commands/recent/index.ts";
import exts from "./commands/exts/index.ts";
import config from "./commands/config/index.ts";
import doctor from "./commands/doctor/index.ts";
import ui from "./commands/ui/index.ts";
import exportCmd from "./commands/export/index.ts";
import importCmd from "./commands/import/index.ts";
import containers from "./commands/containers/index.ts";
import tags from "./commands/tags/index.ts";
import edit from "./commands/edit/index.ts";
import copy from "./commands/copy/index.ts";
import view from "./commands/view/index.ts";
import ai from "./commands/ai/index.ts";
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
program.addCommand(ui);
program.addCommand(exportCmd);
program.addCommand(importCmd);
program.addCommand(containers);
program.addCommand(tags);
program.addCommand(edit);
program.addCommand(copy);
program.addCommand(view);
program.addCommand(ai);

program.parseAsync();
