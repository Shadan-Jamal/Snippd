import { Command } from "commander";
import startApp from "@/server/app.ts";
import { withLoader } from "@/src/utils/loader.ts";

const ui = new Command();

ui
.name("ui")
.description("Start the Snippd UI.")

const uiAction = async () => {
    await withLoader("Starting the UI server...", () => startApp());
};

ui.action(uiAction);

export default ui;