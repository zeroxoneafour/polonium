import { Console as QmlConsole } from "kwin-api";

export class Console {
    private console: QmlConsole;
    // set this to true to disable logs, will make this better in future
    private dontLog: boolean = false;
    constructor(console: QmlConsole) {
        this.console = console;
    }

    log(...args: any[]) {
        if (this.dontLog) return;
        // use console.info for all log levels (except warning and error)
        this.console.info("Polonium LOG:", ...args);
    }
    warn(...args: any[]) {
        this.console.warn("Polonium WRN:", ...args);
    }
    error(...args: any[]) {
        this.console.error("Polonium ERR:", ...args);
    }
}