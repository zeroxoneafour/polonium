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
        this.tilePopups = rc("TilePopups", false);
        this.filterProcess = rc("FilterProcess", "krunner, yakuake, kded, polkit, plasmashell").split(',').map((x: string) => x.trim());
        this.filterCaption = rc("FilterCaption", "").split(',').map((x: string) => x.trim());
        
        this.timerDelay = rc("TimerDelay", 10);
        this.keepTiledBelow = rc("KeepTiledBelow", true);
        this.borders = rc("Borders", Borders.NoTiled);
        
        this.engineType = rc("EngineType", EngineType.BTree);
        this.insertionPoint = rc("InsertionPoint", InsertionPoint.Left);
        this.rotateLayout = rc("RotateLayout", false);
    }
    
    debug: boolean = false;
    
    tilePopups: boolean = false;
    filterProcess: string[] = ["krunner", "yakuake", "kded", "polkit", "plasmashell"];
    filterCaption: string[] = [];
    
    timerDelay: number = 10;
    keepTiledBelow: boolean = true;
    borders: Borders = Borders.NoTiled;

    engineType: EngineType = EngineType.BTree;
    insertionPoint: InsertionPoint = InsertionPoint.Left;
    rotateLayout: boolean = true;
}

let Config = new ConfigClass();
export default Config;

export function init(c: Controller)
{
    Config.init(c);
}
