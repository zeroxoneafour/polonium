// log.ts - Logging support

import { QmlObjects } from "common";
import Config from "util/config";

class LogClass
{
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

export class LogCreator
{
    static log: LogClass;
    static init()
    {
        this.log = new LogClass();
    }
}

const Log = LogCreator.log;
export default Log;
