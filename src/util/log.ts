// log.ts - Logging support

import { KwinApi } from "global";
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
        KwinApi.print(ret);
    }
    
    debug(...stuff: any[])
    {
        if (!Config.debug) return;
        print("Polonium DBG:", stuff);
    }
    
    info(...stuff: any[])
    {
        print("Polonium INF:", stuff);
    }
    
    error(...stuff: any[])
    {
        print("Polonium ERR:", stuff);
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

const log = LogCreator.log;
export default Log = log;