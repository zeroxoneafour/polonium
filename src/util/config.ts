// config.ts - Static config class

import { EngineType } from "../engines/factory";
import { Controller } from "../controller";
import { Api } from "../extern/kwin";

export const enum InsertionPoint
{
    Left = 0,
    Right,
    Active
}

class ConfigClass
{
    private readConfigFn: Api["readConfig"] | undefined;
    
    init(c: Controller)
    {
        this.readConfigFn = c.kwinApi.readConfig;
        this.readConfig();
    }
    
    readConfig()
    {
        let rc = this.readConfigFn;
        if (rc == undefined)
        {
            return;
        }
        this.debug = rc("Debug", false);
        this.engineType = rc("EngineType", EngineType.BTree);
        this.insertionPoint = rc("InsertionPoint", InsertionPoint.Left);
        this.timerDelay = rc("TimerDelay", 10);
    }
    
    debug: boolean = false;
    engineType: EngineType = EngineType.BTree;
    insertionPoint: InsertionPoint = InsertionPoint.Left;
    timerDelay: number = 10;
}

let Config = new ConfigClass();
export default Config;

export function init(c: Controller)
{
    Config.init(c);
}
