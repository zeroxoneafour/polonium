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

    readonly defaultEngine: TilingEngineType;

    readonly ignoreWindowClasses: RegExp;
    readonly borders: BorderSetting;
    readonly tiledWindowsBelow: boolean;
    readonly tilePopups: boolean;

    readonly logLevel: LogLevel;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.rebuildDelay = rc("RebuildDelay", 10);

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

        this.logLevel = rc("LogLevel", LogLevel.Warn);
    }
}
