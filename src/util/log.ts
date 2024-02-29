// log.ts - Logging support

import { Config } from "./config";
import { Root } from "../extern/qml";

export class Log {
    private readonly printFn: Root["printQml"] | undefined;
    private readonly debugEnabled: boolean;

    constructor(config: Config, root: Root) {
        this.printFn = root.printQml;
        this.debugEnabled = config.debug;
    }

    private print(opener: string, stuff: any[]): void {
        if (this.printFn == undefined) {
            return;
        }
        let ret = opener;
        for (const s of stuff) {
            ret += " ";
            if (typeof s == "string") {
                ret += s;
            } else {
                ret += s.toString();
            }
        }
        this.printFn(ret);
    }

    debug(...stuff: any[]): void {
        if (!this.debugEnabled) return;
        this.print("Polonium DBG:", stuff);
    }

    info(...stuff: any[]) {
        this.print("Polonium INF:", stuff);
    }

    error(...stuff: any[]) {
        this.print("Polonium ERR:", stuff);
    }
}
