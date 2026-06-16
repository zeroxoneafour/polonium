import { KWin } from "kwin-api/qml";
import { BTreeInsertionStyle, TilingEngineType } from "../engine";

export enum LogLevel {
    Error = 0,
    Warn,
    Log,
    Debug,
}
export enum BorderSetting {
    NoBorders = 0,
    BorderFloating,
    BorderActive,
    BorderFloatingActive,
    BorderAll,
}

export class Config {
    readonly rebuildDelay: number;
    readonly tileResizeAmount: number;
    readonly fullRebuild: boolean;
    readonly preserveOldDrivers: boolean;
    readonly useDBusSaver: boolean;

    readonly logLevel: LogLevel;

    readonly defaultEngine: TilingEngineType;

    readonly btreeSettings: object;
    readonly halfSettings: object;
    readonly threeColumnSettings: object;

    readonly ignoreWindowClasses: RegExp;
    readonly borders: BorderSetting;
    readonly tiledWindowsBelow: boolean;
    readonly tilePopups: boolean;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.rebuildDelay = rc("RebuildDelay", 10);
        this.tileResizeAmount = rc("TileResizeAmount", 10);
        this.fullRebuild = rc("FullRebuild", true);
        this.preserveOldDrivers = rc("PreserveOldDrivers", true);
        this.useDBusSaver = rc("UseDBusSaver", false);

        this.logLevel = rc("LogLevel", LogLevel.Warn);

        this.defaultEngine = rc("DefaultEngine", TilingEngineType.BTree);

        this.btreeSettings = {
            swapInsertSide: rc("BTreeSwapInsertSide", false),
            rotateLayout: rc("BTreeRotateLayout", false),
            insertionStyle: rc(
                "BTreeInsertionStyle",
                BTreeInsertionStyle.Shallow,
            ),
            insertInActive: rc("BTreeInsertInActive", false),
        };
        this.halfSettings = {
            swapInsertSide: rc("HalfSwapInsertSide", false),
            middleSplit: rc("HalfMiddleSplit", 0.5),
            rotateLayout: rc("HalfRotateLayout", false),
            insertInActive: rc("HalfInsertInActive", false),
        };
        this.threeColumnSettings = {
            swapInsertSide: rc("ThreeColumnSwapInsertSide", false),
            side1Size: rc("ThreeColumnSide1Size", 0.25),
            side2Size: rc("ThreeColumnSide2Size", 0.25),
            rotateLayout: rc("ThreeColumnRotateLayout", false),
        };

        this.ignoreWindowClasses = new RegExp(
            rc(
                "IgnoreWindowClasses",
                "krunner, yakuake, kded, polkit, plasmashell, xwaylandvideobridge",
            )
                .split(",")
                .map((x) => x.trim())
                .join("|"),
        );
        this.borders = rc("Borders", BorderSetting.BorderAll);
        this.tiledWindowsBelow = rc("TiledWindowsBelow", true);
        this.tilePopups = rc("TilePopups", false);
    }
}
