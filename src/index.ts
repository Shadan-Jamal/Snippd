import { program } from "commander";
import save from "../commands/save.ts"
import search from "../commands/search.ts";

program.addCommand(save);
program.addCommand(search);

program.parseAsync();