// log.ts - Logging support

import Config from "util/config";
import { qmlObjects } from "util/global";

export default class Log
{
    private static print(opener: string, stuff: any[])
    {
        let ret = opener;
        for (const s in stuff)
        {
            ret += " ";
            ret += s;
        }
        qmlObjects.root.print(ret);
    }
    static debug(...stuff: any[])
    {
        if (!Config.debug) return;
        this.print("Polonium DBG:", stuff);
    }
    static info(...stuff: any[])
    {
        this.print("Polonium INF:", stuff);
    }
    static error(...stuff: any[])
    {
        this.print("Polonium ERR:", stuff);
    }
}
