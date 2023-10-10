// log.ts - Logging support

import Config from "./config";
import { Controller } from "../controller";

class LogClass
{
    private static instance: LogClass;
    static get Instance()
    {
        return this.instance;
    }
    static init(c: Controller)
    {
        this.instance = new LogClass(c);
    }
    private printFn: Function;
    private constructor(c: Controller)
    {
        this.printFn = c.qmlObjects.root.printQml;
    }
    private print(opener: string, stuff: any[])
    {
        let ret = opener;
        for (const s in stuff)
        {
            ret += " ";
            ret += s;
        }
        this.printFn(ret);
    }
    debug(...stuff: any[])
    {
        if (!Config.debug) return;
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

export function init(c: Controller)
{
    LogClass.init(c);
}
