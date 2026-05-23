import { Console as QmlConsole } from "kwin-api";

export class Console {
    private console: QmlConsole;
    constructor(console: QmlConsole) {
        this.console = console;
    }

    log(...args: any[]) {
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