import { KWin } from "kwin-api/qml";
import {
    BTreeInsertionStyle,
    PillarsInsertionStyle,
    TilingEngineType,
} from "../engine";

export enum LogLevel {
    Error = 0,
    Warn,
    Log,
    Debug,
}
export enum Borders {
    None = 0,
    Floating,
    Active,
    FloatingActive,
    All,
}

export class Config {
    readonly rebuildDelay: number;
    readonly tileResizeAmount: number;
    readonly useDBusSaver: boolean;

    readonly logLevel: LogLevel;

    readonly defaultEngine: TilingEngineType;

    readonly btreeSettings: object;
    readonly halfSettings: object;
    readonly threeColumnSettings: object;
    readonly pillarSettings: object;
    readonly pagerSettings: object;

    readonly rawRegex: boolean;
    readonly ignoreWindowClasses: RegExp;
    readonly ignoreWindowCaptions: RegExp;
    readonly borders: Borders;
    readonly tiledWindowsBelow: boolean;
    readonly tilePopups: boolean;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.rebuildDelay = rc("RebuildDelay", 10);
        this.tileResizeAmount = rc("TileResizeAmount", 10);
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
            keepMaster: rc("HalfKeepMaster", false),
        };
        this.threeColumnSettings = {
            swapInsertSide: rc("ThreeColumnSwapInsertSide", false),
            side1Size: rc("ThreeColumnSide1Size", 0.25),
            side2Size: rc("ThreeColumnSide2Size", 0.25),
            rotateLayout: rc("ThreeColumnRotateLayout", false),
        };
        this.pillarSettings = {
            pillarCount: rc("PillarsPillarCount", 3),
            swapInsertSide: rc("PillarsSwapInsertSide", false),
            insertionStyle: rc(
                "PillarsInsertionStyle",
                PillarsInsertionStyle.Rows,
            ),
            rotateLayout: rc("PillarsRotateLayout", false),
            insertInActive: rc("PillarsInsertInActive", false),
        };
        this.pagerSettings = {
            pageWidth: rc("PagerPageWidth", 0.15),
            swapInsertSide: rc("PagerSwapInsertSide", false),
            rotateLayout: rc("PagerRotateLayout", false),
        };

        this.rawRegex = rc("RawRegex", false);
        let ignoreWindowClasses = rc(
            "IgnoreWindowClasses",
            "krunner, yakuake, kded, polkit, plasmashell, xwaylandvideobridge",
        );
        if (!this.rawRegex) {
            ignoreWindowClasses = commaRegex(ignoreWindowClasses);
            ignoreWindowClasses = "^" + ignoreWindowClasses + "$";
        }
        this.ignoreWindowClasses = new RegExp(ignoreWindowClasses);
        let ignoreWindowCaptions = rc("IgnoreWindowCaptions", "");
        if (!this.rawRegex) {
            ignoreWindowCaptions = commaRegex(ignoreWindowCaptions);
            ignoreWindowCaptions = "^" + ignoreWindowCaptions + "$";
        }
        this.ignoreWindowCaptions = new RegExp(ignoreWindowCaptions);
        this.borders = rc("Borders", Borders.All);
        this.tiledWindowsBelow = rc("TiledWindowsBelow", true);
        this.tilePopups = rc("TilePopups", false);
    }
}

function commaRegex(str: string): string {
    return str
        .split(",")
        .map((x) => x.trim())
        .join("|");
}
