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
    BorderAll
}

export class Config {
    readonly logLevel: LogLevel;
    readonly rebuildDelay: number;
    readonly defaultEngine: TilingEngineType;
    readonly ignoreWindowClasses: string[];
    readonly borders: BorderSetting;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.logLevel = rc("LogLevel", LogLevel.Warn);
        this.rebuildDelay = rc("RebuildDelay", 10);
        this.defaultEngine = rc("DefaultEngine", TilingEngineType.BTree);
        this.ignoreWindowClasses = rc("IgnoreWindowClasses", "krunner, yakuake, kded, polkit, plasmashell, xwaylandvideobridge")
            .split(",").map(x => x.trim());
        this.borders = rc("Borders", BorderSetting.BorderAll);
    }
}