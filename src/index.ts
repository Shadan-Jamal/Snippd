import { program } from "commander";
import save from "./commands/save.ts"
import search from "./commands/search.ts";
import deleteCmd from "./commands/delete.ts";
import list from "./commands/list.ts";
import recent from "./commands/recent.ts";
import ext from "./commands/ext.ts";
import config from "./commands/config.ts";
import { isConfigured } from "./config/index.ts";
import { runSetup } from "./config/setup.ts";

program.hook("preAction", async (thisCommand) => {
    // Skip setup for the config command itself
    const cmdName = thisCommand.name();
    if (cmdName === "config" || thisCommand.parent?.name() === "config") return;
    if (!isConfigured()) {
        await runSetup();
    }
});

program.addCommand(save);
program.addCommand(search);
program.addCommand(deleteCmd);
program.addCommand(list);
program.addCommand(recent);
program.addCommand(ext);
program.addCommand(config);

program.parseAsync();