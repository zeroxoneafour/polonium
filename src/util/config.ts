// config.ts - Static config class

import { EngineType } from "../engine/factory";
import { Controller } from "../controller";
import { Api } from "../extern/kwin";

export const enum InsertionPoint
{
    Left = 0,
    Right,
    Active
}

export const enum Borders
{
    NoAll,
    NoTiled,
    Selected,
    All
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
        this.keepTiledBelow = rc("KeepTiledBelow", true);
        this.borders = rc("Borders", Borders.NoTiled);
    }
    
    debug: boolean = false;
    engineType: EngineType = EngineType.BTree;
    insertionPoint: InsertionPoint = InsertionPoint.Left;
    timerDelay: number = 10;
    keepTiledBelow: boolean = true;
    borders: Borders = Borders.NoTiled;
}

let Config = new ConfigClass();
export default Config;

export function init(c: Controller)
{
    Config.init(c);
}
