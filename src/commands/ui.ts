import { Command } from "commander";
import startApp from "../server/app.ts";

const ui = new Command();

ui
.name("ui")
.description("Start the Snippd UI.")

const uiAction = async () => {
    await startApp();
};

ui.action(uiAction);

export default ui;