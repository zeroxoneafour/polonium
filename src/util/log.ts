// log.ts - Logging support

import { QmlObjects } from "../common";
import Config from "./config";

class LogClass
{
    private static instance: LogClass | null = null;
    static get Instance()
    {
        if (this.instance == null)
        {
            this.instance = new LogClass();
        }
        return this.instance;
    }

    private printFn: Function;
    private constructor()
    {
        printFn = QmlObjects.root.print;
    }
    private print(opener: string, stuff: any[])
    {
        let ret = opener;
        for (const s in stuff) {
            ret += " ";
            ret += s;
        }
        QmlObjects.root.print(ret);
    }
    debug(...stuff: any[])
    {
        if (!Config.Debug) return;
        this.print("Polonium DBG:", stuff);
    }
    
    info(...stuff: any[])
    {
        this.print("Polonium INF:", stuff);
    }
    
    error(...stuff: any[])
    {
        this.print("Polonium ERR:", stuff);
    }
}

const Log = LogClass.Instance;
export default Log;
