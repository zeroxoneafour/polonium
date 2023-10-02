// log.ts - Logging support

import Controller from "controller";

export default class Log
{
    ctrl: Controller;
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
    private print(opener: string, stuff: any[])
    {
        let ret = opener;
        for (const s in stuff)
        {
            ret += " ";
            ret += s;
        }
        this.ctrl.qmlObjects.root.print(ret);
    }
    debug(...stuff: any[])
    {
        if (!this.ctrl.config.debug) return;
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
