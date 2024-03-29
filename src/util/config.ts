// config.ts - Static config class

import { EngineType } from "../engine";
import { KWin } from "kwin-api/qml";

export const enum InsertionPoint {
    Left = 0,
    Right,
    Active,
}

export const enum Borders {
    NoAll,
    NoTiled,
    Selected,
    All,
}

export class Config {
    private readonly readConfigFn: KWin["readConfig"] | undefined;

    constructor(kwinApi: KWin) {
        this.readConfigFn = kwinApi.readConfig;
        this.readConfig();
    }

    readConfig(): void {
        let rc = this.readConfigFn;
        if (rc == undefined) {
            return;
        }
        this.debug = rc("Debug", false);
        this.tilePopups = rc("TilePopups", false);
        this.filterProcess = rc(
            "FilterProcess",
            "krunner, yakuake, kded, polkit, plasmashell",
        )
            .split(",")
            .map((x: string) => x.trim());
        this.filterCaption = rc("FilterCaption", "")
            .split(",")
            .map((x: string) => x.trim());

        this.timerDelay = rc("TimerDelay", 10);
        this.keepTiledBelow = rc("KeepTiledBelow", true);
        this.borders = rc("Borders", Borders.NoTiled);
        this.maximizeSingle = rc("MaximizeSingle", false);
        this.resizeAmount = rc("ResizeAmount", 10);
        this.saveOnTileEdit = rc("SaveOnTileEdit", false);

        this.engineType = rc("EngineType", EngineType.BTree);
        this.insertionPoint = rc("InsertionPoint", InsertionPoint.Left);
        this.rotateLayout = rc("RotateLayout", false);
    }

    debug: boolean = false;

    tilePopups: boolean = false;
    filterProcess: string[] = [
        "krunner",
        "yakuake",
        "kded",
        "polkit",
        "plasmashell",
    ];
    filterCaption: string[] = [];

    timerDelay: number = 10;
    keepTiledBelow: boolean = true;
    borders: Borders = Borders.NoTiled;
    maximizeSingle: boolean = false;
    resizeAmount: number = 10;
    saveOnTileEdit: boolean = false;

    engineType: EngineType = EngineType.BTree;
    insertionPoint: InsertionPoint = InsertionPoint.Left;
    rotateLayout: boolean = true;
}
