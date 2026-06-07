import { program } from "commander";
import save from "../commands/save.ts"
import search from "../commands/search.ts";
import deleteCmd from "../commands/delete.ts";
import list from "../commands/list.ts";

program.addCommand(save);
program.addCommand(search);
program.addCommand(deleteCmd);
program.addCommand(list);

program.parseAsync();