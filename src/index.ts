import { program } from "commander";
import save from "../commands/save.ts"

program.addCommand(save);

program.parse();