// log.ts - Logging support

import Config from "./config";
import { Root } from "../extern/qml";
import { Controller } from "../controller";

class LogClass
{
    private printFn: Root["printQml"] | undefined;
    init(c: Controller)
    {
        this.printFn = c.qmlObjects.root.printQml;
    }
    private print(opener: string, stuff: any[])
    {
        if (this.printFn == undefined)
        {
            return;
        }
        let ret = opener;
        for (const s of stuff)
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

let Log = new LogClass();
export default Log;

export function init(c: Controller)
{
    Log.init(c);
}
