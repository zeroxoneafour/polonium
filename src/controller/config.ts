import { KWin } from "kwin-api/qml";
import { TilingEngineType } from "../engine";

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
    readonly logLevel: LogLevel;

    readonly defaultEngine: TilingEngineType;

    readonly ignoreWindowClasses: RegExp;
    readonly borders: BorderSetting;
    readonly tiledWindowsBelow: boolean;
    readonly tilePopups: boolean;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.rebuildDelay = rc("RebuildDelay", 10);
        this.tileResizeAmount = rc("TileResizeAmount", 10);
        this.fullRebuild = rc("FullRebuild", true);
        this.logLevel = rc("LogLevel", LogLevel.Warn);

        this.defaultEngine = rc("DefaultEngine", TilingEngineType.BTree);

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
