import { program } from "commander";
import save from "../commands/save.ts"
import search from "../commands/search.ts";
import deleteCmd from "../commands/delete.ts";

program.addCommand(save);
program.addCommand(search);
program.addCommand(deleteCmd);

program.parseAsync();