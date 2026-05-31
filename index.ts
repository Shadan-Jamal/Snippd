import { program } from "commander";
import save from "./commands/save"

program.addCommand(save);

program.parse();