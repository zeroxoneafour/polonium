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
export enum DragPolicy {
    Always = 0,
    Tiled,
    Never,
}
export enum DragRetilePoint {
    Mouse = 0,
    Center,
    Top,
}
export enum UltrawidePosition {
    Center = 0,
    Left,
    Right,
}
export enum WarpCursor {
    Never = 0,
    OnShortcut,
    Always,
}
export enum KWinVersion {
    SixFour = 0,
    SixSeven,
}

export class Config {
    readonly rebuildDelay: number;
    readonly tileResizeAmount: number;
    readonly useDBusSaver: boolean;
    readonly warpCursor: WarpCursor;
    readonly kwinVersion: KWinVersion;

    readonly logLevel: LogLevel;

    readonly defaultEngine: TilingEngineType;

    readonly btreeSettings: object;
    readonly halfSettings: object;
    readonly threeColumnSettings: object;
    readonly pillarSettings: object;
    readonly pagerSettings: object;
    readonly kwinSettings: object;

    readonly borders: Borders;
    readonly tiledWindowsBelow: boolean;
    readonly windowDragPolicy: DragPolicy;
    readonly dragRetilePoint: DragRetilePoint;

    readonly rawRegex: boolean;
    readonly ignoreWindowClasses: RegExp;
    readonly ignoreWindowCaptions: RegExp;
    readonly untileWindowClasses: RegExp;
    readonly untileWindowCaptions: RegExp;
    // console isnt available while config is read, so errors are logged after init
    readonly regexErrors: string[] = [];
    readonly tilePopups: boolean;

    constructor(kwinApi: KWin) {
        const rc = kwinApi.readConfig;

        this.rebuildDelay = rc("RebuildDelay", 10);
        this.tileResizeAmount = rc("TileResizeAmount", 10);
        this.useDBusSaver = rc("UseDBusSaver", false);
        this.warpCursor = rc("WarpCursor", WarpCursor.Never);
        this.kwinVersion = rc("KWinVersion", KWinVersion.SixFour);

        this.logLevel = rc("LogLevel", LogLevel.Warn);

        this.defaultEngine = rc("DefaultEngine", TilingEngineType.BTree);
        let engineSettings = {
            ultrawideEnabled: rc("UltrawideEnabled", false),
            ultrawideWidth: rc("UltrawideWidth", 0.6),
            ultrawidePosition: rc(
                "UltrawidePosition",
                UltrawidePosition.Center,
            ),
        };
        this.btreeSettings = Object.assign(
            {
                swapInsertSide: rc("BTreeSwapInsertSide", false),
                rotateLayout: rc("BTreeRotateLayout", false),
                insertionStyle: rc(
                    "BTreeInsertionStyle",
                    BTreeInsertionStyle.Shallow,
                ),
                insertInActive: rc("BTreeInsertInActive", false),
            },
            engineSettings,
        );
        this.halfSettings = Object.assign(
            {
                swapInsertSide: rc("HalfSwapInsertSide", false),
                middleSplit: rc("HalfMiddleSplit", 0.5),
                rotateLayout: rc("HalfRotateLayout", false),
                insertInActive: rc("HalfInsertInActive", false),
                keepMaster: rc("HalfKeepMaster", false),
            },
            engineSettings,
        );
        this.threeColumnSettings = Object.assign(
            {
                swapInsertSide: rc("ThreeColumnSwapInsertSide", false),
                side1Size: rc("ThreeColumnSide1Size", 0.25),
                side2Size: rc("ThreeColumnSide2Size", 0.25),
                rotateLayout: rc("ThreeColumnRotateLayout", false),
            },
            engineSettings,
        );
        this.pillarSettings = Object.assign(
            {
                pillarCount: rc("PillarsPillarCount", 3),
                swapInsertSide: rc("PillarsSwapInsertSide", false),
                insertionStyle: rc(
                    "PillarsInsertionStyle",
                    PillarsInsertionStyle.Rows,
                ),
                rotateLayout: rc("PillarsRotateLayout", false),
                insertInActive: rc("PillarsInsertInActive", false),
            },
            engineSettings,
        );
        this.pagerSettings = Object.assign(
            {
                pageWidth: rc("PagerPageWidth", 0.15),
                swapInsertSide: rc("PagerSwapInsertSide", false),
                rotateLayout: rc("PagerRotateLayout", false),
            },
            engineSettings,
        );
        this.kwinSettings = {};

        this.borders = rc("Borders", Borders.All);
        this.tiledWindowsBelow = rc("TiledWindowsBelow", true);
        this.tilePopups = rc("TilePopups", false);
        this.windowDragPolicy = rc("WindowDragPolicy", DragPolicy.Tiled);
        this.dragRetilePoint = rc("DragRetilePoint", DragRetilePoint.Mouse);

        this.rawRegex = rc("RawRegex", false);
        const ignoreWindowClasses = rc(
            "IgnoreWindowClasses",
            "krunner, yakuake, kded, polkit, plasmashell, xwaylandvideobridge",
        );
        const ignoreWindowCaptions = rc("IgnoreWindowCaptions", "");
        const untileWindowClasses = rc("UntileWindowClasses", "");
        const untileWindowCaptions = rc("UntileWindowCaptions", "");
        this.ignoreWindowClasses = this.buildRegex(ignoreWindowClasses);
        this.ignoreWindowCaptions = this.buildRegex(ignoreWindowCaptions);
        this.untileWindowClasses = this.buildRegex(untileWindowClasses);
        this.untileWindowCaptions = this.buildRegex(untileWindowCaptions);
    }

    // an invalid pattern should never stop the script from loading
    private buildRegex(str: string): RegExp {
        if (this.rawRegex) {
            // an empty regex would match every window
            if (str === "") {
                return neverMatch;
            }
            try {
                return new RegExp(str);
            } catch (e) {
                this.regexErrors.push(
                    `invalid regex "${str}" (${(e as Error).message}), ignoring it`,
                );
                return neverMatch;
            }
        }
        const parts = str
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .map((part) => {
                try {
                    new RegExp(part);
                    return part;
                } catch (e) {
                    this.regexErrors.push(
                        `invalid regex "${part}" (${(e as Error).message}), matching it literally`,
                    );
                    return escapeRegex(part);
                }
            });
        // An empty pattern would become /^$/, matching windows with empty initial metadata.
        if (parts.length == 0) {
            return neverMatch;
        }
        // group the alternatives so ^ and $ apply to all of them, not just the first and last
        return new RegExp("^(?:" + parts.join("|") + ")$");
    }
}

const neverMatch = /(?!)/;

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
