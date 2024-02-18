// config.ts - Static config class

import { EngineType } from "../engine/factory";
import { Controller } from "../controller";
import { QmlKWin } from "kwin-api";

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
    private readonly readConfigFn: QmlKWin["readConfig"] | undefined;

    constructor(kwinApi: QmlKWin) {
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

    engineType: EngineType = EngineType.BTree;
    insertionPoint: InsertionPoint = InsertionPoint.Left;
    rotateLayout: boolean = true;
}
